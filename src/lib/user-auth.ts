import { signSession, verifySession } from '@/lib/admin-auth';
import { sessionKeys } from '@/lib/session-keys';

/**
 * Founder (end-user) sessions, verified in `proxy.ts` (Node runtime) and route handlers.
 * Keys come from `session-keys.ts`; password hashing lives in `passwords.ts`.
 *
 * The token format is the admin one (`<payload>.<signature>`, subject = user id), but it
 * is signed with a key derived for this purpose, so a founder cookie can never verify as
 * an admin cookie even when both resolve to the same secret.
 */

export const USER_COOKIE = 'istartup_session';
export const USER_SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;

export async function userSecret(): Promise<string> {
  return `${(await sessionKeys()).user}|istartup-user-session`;
}

/**
 * The cookie subject is `<userId>:v<session_version>`. Bumping the user's
 * `session_version` (sign out everywhere) invalidates every cookie signed before it.
 * Cookies from before versioning carry a bare user id and read as version 0, which is
 * also the version of every account that has never been bumped, so they stay valid.
 */
export interface UserSession {
  userId: string;
  version: number;
}

export async function signUserSession(userId: string, version = 0): Promise<string> {
  return signSession(`${userId}:v${version}`, await userSecret(), USER_SESSION_MAX_AGE_S);
}

/** The signature-checked session (user id + version), or null. Does not check the user exists. */
export async function parseUserSession(cookieValue: string | undefined | null): Promise<UserSession | null> {
  const subject = await verifySession(cookieValue, await userSecret());
  if (!subject) return null;
  const versioned = /^(.+):v(\d{1,9})$/.exec(subject);
  return versioned ? { userId: versioned[1], version: Number(versioned[2]) } : { userId: subject, version: 0 };
}

/**
 * Returns the cookie's user id, or null. Signature and expiry only — used by `proxy.ts`
 * as a cheap first gate; route handlers and pages use `account.ts`, which also checks
 * the account still exists and the session hasn't been revoked.
 */
export async function verifyUserSession(cookieValue: string | undefined | null): Promise<string | null> {
  return (await parseUserSession(cookieValue))?.userId ?? null;
}

/** A user record's current session version (absent on accounts never signed out everywhere). */
export const sessionVersionOf = (user: { session_version?: number | null }) => user.session_version ?? 0;

/**
 * Resolves a cookie to its user: the signature and expiry must hold, the account must
 * still exist, and the cookie's session version must be the account's current one.
 */
export async function resolveUserSession<U extends { session_version?: number | null }>(
  cookieValue: string | undefined | null,
  loadUser: (userId: string) => Promise<U | null>,
): Promise<U | null> {
  const session = await parseUserSession(cookieValue);
  if (!session) return null;
  const user = await loadUser(session.userId);
  if (!user || sessionVersionOf(user) !== session.version) return null;
  return user;
}

export function userCookieHeader(value: string, maxAge = USER_SESSION_MAX_AGE_S): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${USER_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
