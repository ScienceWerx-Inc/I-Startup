import { signSession, verifySession } from '@/lib/admin-auth';

/**
 * Founder (end-user) sessions. Edge-safe: only Web Crypto, so `proxy.ts` can verify the
 * cookie. Password hashing lives in `passwords.ts` (Node only).
 *
 * The token format is the admin one (`<payload>.<signature>`, subject = user id), but it
 * is signed with a key derived for this purpose, so a founder cookie can never verify as
 * an admin cookie even when both fall back to the same configured secret.
 */

export const USER_COOKIE = 'istartup_session';
export const USER_SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;

export function userSecret(): string {
  const base =
    process.env.AUTH_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (base) return `${base}|istartup-user-session`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is not set. Founder sessions cannot be signed.');
  }
  return 'dev-only-user-secret';
}

export function signUserSession(userId: string): Promise<string> {
  return signSession(userId, userSecret(), USER_SESSION_MAX_AGE_S);
}

/** Returns the signed-in user's id, or null. */
export function verifyUserSession(cookieValue: string | undefined | null): Promise<string | null> {
  return verifySession(cookieValue, userSecret());
}

export function userCookieHeader(value: string, maxAge = USER_SESSION_MAX_AGE_S): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${USER_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
