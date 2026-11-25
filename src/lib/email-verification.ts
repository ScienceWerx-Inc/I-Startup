import { createHash } from 'node:crypto';

import { signSession, verifySession } from '@/lib/admin-auth';
import { col, db, nowIso } from '@/lib/db';
import { sendEmail, type SendResult } from '@/lib/email';
import { sessionKeys } from '@/lib/session-keys';

/**
 * Email verification: a signed, single-purpose link, valid 24 hours.
 *
 * The token reuses the session token format (`<payload>.<signature>`), but is signed with
 * a key derived for this purpose only, and its subject is prefixed `ev1:` — so it never
 * verifies as a session cookie, and a session cookie never verifies as one of these.
 * It names the user and a hash of the address it was sent to: once the account's email
 * differs, the link stops working. Sign-in is not needed to use it (the founder may open
 * the email on another device); owning the mailbox is the proof.
 */

export const EMAIL_VERIFY_MAX_AGE_S = 24 * 60 * 60;
const PREFIX = 'ev1';

export const emailFingerprint = (email: string) =>
  createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 24);

async function verifySecret(): Promise<string> {
  return `${(await sessionKeys()).user}|istartup-email-verify`;
}

export async function signEmailVerifyToken(userId: string, email: string): Promise<string> {
  return signSession(`${PREFIX}:${userId}:${emailFingerprint(email)}`, await verifySecret(), EMAIL_VERIFY_MAX_AGE_S);
}

/** The user id and address fingerprint a token was issued for, or null (bad, expired or another purpose). */
export async function readEmailVerifyToken(
  token: string | null | undefined,
): Promise<{ userId: string; fingerprint: string } | null> {
  if (!token || token.length > 400) return null;
  const subject = await verifySession(token, await verifySecret());
  const m = subject ? /^ev1:([^:]{1,64}):([0-9a-f]{24})$/.exec(subject) : null;
  return m ? { userId: m[1], fingerprint: m[2] } : null;
}

/** True when the token was issued for this user at this address. */
export async function emailVerifyTokenMatches(
  token: string | null | undefined,
  user: { id: string; email: string },
): Promise<boolean> {
  const read = await readEmailVerifyToken(token);
  return Boolean(read && read.userId === user.id && read.fingerprint === emailFingerprint(user.email));
}

export const verifyEmailLink = (origin: string, token: string) =>
  `${origin.replace(/\/+$/, '')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

/** Where emailed links point: APP_URL when set, else the request's own origin. */
export const linkOrigin = (request: Request) =>
  (process.env.APP_URL?.replace(/\/+$/, '') || new URL(request.url).origin);

/**
 * Emails the founder their verification link. When email isn't configured, outside
 * production the link is printed to the server console so the flow can be tested locally.
 */
export async function sendVerificationEmail(
  user: { id: string; email: string; full_name?: string },
  origin: string,
): Promise<SendResult> {
  const link = verifyEmailLink(origin, await signEmailVerifyToken(user.id, user.email));
  const first = user.full_name?.trim().split(/\s+/)[0];
  const text = [
    `Hi${first ? ` ${first}` : ''},`,
    '',
    'Please confirm this is your email address for iStartup Score:',
    '',
    link,
    '',
    'The link works for 24 hours. If you did not create an iStartup Score account, you can ignore this email.',
    '',
    'iStartup Score',
  ].join('\n');
  const result = await sendEmail(user.email, 'Confirm your email for iStartup Score', text);
  if (result === 'off' && process.env.NODE_ENV !== 'production') {
    console.info(`[email] dev only, verification link: ${link}`);
  }
  return result;
}

/* ───────────────────────────── resend limit ───────────────────────────── */

export const RESEND_LIMIT = 3;
export const RESEND_WINDOW_MS = 60 * 60 * 1000;

/**
 * Whether one more resend fits: at most RESEND_LIMIT in any rolling hour. Returns the
 * history to store (pruned to the window, plus `now` when admitted).
 */
export function admitResend(
  history: readonly string[],
  now = Date.now(),
): { ok: true; history: string[] } | { ok: false; history: string[]; retryAfterS: number } {
  const recent = history
    .map((iso) => Date.parse(iso))
    .filter((t) => Number.isFinite(t) && t > now - RESEND_WINDOW_MS && t <= now)
    .sort((a, b) => a - b);
  const kept = recent.map((t) => new Date(t).toISOString());
  if (recent.length >= RESEND_LIMIT) {
    return { ok: false, history: kept, retryAfterS: Math.max(1, Math.ceil((recent[0] + RESEND_WINDOW_MS - now) / 1000)) };
  }
  return { ok: true, history: [...kept, new Date(now).toISOString()] };
}

/** Read-modify-write of one founder's resend history, atomically. */
export interface ResendLog {
  transact<T>(userId: string, fn: (history: string[]) => { history: string[]; result: T }): Promise<T>;
}

export const firestoreResendLog: ResendLog = {
  transact(userId, fn) {
    return db().runTransaction(async (tx) => {
      const ref = col('emailVerifications').doc(userId);
      const snap = await tx.get(ref);
      const stored = snap.exists ? snap.get('resends') : null;
      const { history, result } = fn(Array.isArray(stored) ? stored.filter((s): s is string => typeof s === 'string') : []);
      tx.set(ref, { resends: history, updated_at: nowIso() });
      return result;
    });
  },
};

/** Claims one resend for `userId` if the hourly limit allows it (persisted, so it holds across instances). */
export function reserveResend(userId: string, log: ResendLog = firestoreResendLog, now = Date.now()) {
  return log.transact(userId, (history) => {
    const admitted = admitResend(history, now);
    return { history: admitted.history, result: admitted };
  });
}
