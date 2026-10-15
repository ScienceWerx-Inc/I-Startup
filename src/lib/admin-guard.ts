import { cookies } from 'next/headers';

import { ADMIN_COOKIE, safeEqual, verifySession } from '@/lib/admin-auth';
import { col, emailKey, isDatabaseConfigured, nowIso } from '@/lib/db';
import { DUMMY_HASH, verifyPassword } from '@/lib/passwords';
import { sessionKeys } from '@/lib/session-keys';

/**
 * Admin accounts. Two sources, both with full console access:
 *   - the env admin (`ADMIN_USERNAME` / `ADMIN_PASSWORD`), when set;
 *   - Firestore `istartup_admins/{email}` docs (scrypt hash), created with
 *     `node scripts/create-admin.mjs`.
 * A session is only honoured while its account still exists, so deleting an admin
 * doc revokes access immediately.
 */

export async function adminSecret(): Promise<string> {
  return (await sessionKeys()).admin;
}

const normalize = (username: string) => username.trim().toLowerCase();

function isEnvAdmin(username: string): boolean {
  const envUser = process.env.ADMIN_USERNAME;
  return Boolean(envUser && process.env.ADMIN_PASSWORD && safeEqual(username, envUser));
}

async function adminDoc(username: string) {
  if (!isDatabaseConfigured()) return null;
  const snap = await col('admins').doc(emailKey(normalize(username))).get();
  return snap.exists ? snap : null;
}

/** Checks a username/password pair; returns the session subject, or null. */
export async function authenticateAdmin(username: string, password: string): Promise<string | null> {
  if (isEnvAdmin(username)) {
    return safeEqual(password, process.env.ADMIN_PASSWORD ?? '') ? username : null;
  }
  const doc = await adminDoc(username);
  // Hash even when the account is unknown so timing doesn't reveal which admins exist.
  const ok = await verifyPassword(password, (doc?.get('password_hash') as string) ?? DUMMY_HASH);
  if (!doc || !ok) return null;
  await doc.ref.update({ last_login_at: nowIso() });
  return doc.get('email') as string;
}

/** The admin a cookie value belongs to, or null (bad signature, expired, or account gone). */
export async function verifyAdminCookie(value: string | undefined | null): Promise<string | null> {
  const username = await verifySession(value, await adminSecret());
  if (!username) return null;
  if (isEnvAdmin(username)) return username;
  return (await adminDoc(username)) ? username : null;
}

/** The signed-in admin's username, or null. For route handlers and server components. */
export async function currentAdmin(): Promise<string | null> {
  const store = await cookies();
  return verifyAdminCookie(store.get(ADMIN_COOKIE)?.value);
}

export const unauthorized = () => Response.json({ error: 'Unauthorized.' }, { status: 401 });
