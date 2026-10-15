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

export async function signUserSession(userId: string): Promise<string> {
  return signSession(userId, await userSecret(), USER_SESSION_MAX_AGE_S);
}

/** Returns the signed-in user's id, or null. */
export async function verifyUserSession(cookieValue: string | undefined | null): Promise<string | null> {
  return verifySession(cookieValue, await userSecret());
}

export function userCookieHeader(value: string, maxAge = USER_SESSION_MAX_AGE_S): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${USER_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
