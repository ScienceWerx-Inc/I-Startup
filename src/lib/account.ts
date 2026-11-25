import { cookies } from 'next/headers';

import { col } from '@/lib/db';
import { USER_COOKIE, resolveUserSession } from '@/lib/user-auth';
import type { OnboardingAnswers } from '@/modules/istartup-score/onboarding/fields';

/** Server-only account lookups for route handlers. */

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  onboarding: OnboardingAnswers;
  created_at: string;
  last_login_at?: string | null;
  /** Bumped to revoke every outstanding session (see user-auth.ts); absent means 0. */
  session_version?: number;
  /** When the founder proved they own `email` (clicked the emailed link); absent until then. */
  email_verified_at?: string | null;
}

/** A user document as stored, including the password hash (never send this to a client). */
export type StoredUser = Omit<UserRow, 'id'> & { password_hash: string };

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  onboarding: OnboardingAnswers;
  emailVerified: boolean;
}

export const toPublicUser = (u: UserRow): PublicUser => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name,
  onboarding: u.onboarding ?? {},
  emailVerified: Boolean(u.email_verified_at),
});

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * The signed-in user's id, or null when signed out, the account no longer exists, or the
 * session was revoked. One user read; never throws (a failed read counts as signed out).
 */
export async function sessionUserId(): Promise<string | null> {
  try {
    return (await currentUser())?.id ?? null;
  } catch (error) {
    console.error('Session check failed:', error);
    return null;
  }
}

/** The signed-in user, or null when signed out, the account no longer exists, or the session was revoked. */
export async function currentUser(): Promise<UserRow | null> {
  const store = await cookies();
  return resolveUserSession(store.get(USER_COOKIE)?.value, getUser);
}

export async function getUser(id: string): Promise<UserRow | null> {
  const snap = await col('users').doc(id).get();
  if (!snap.exists) return null;
  const { password_hash: _hash, ...user } = snap.data() as StoredUser;
  return { id: snap.id, ...user };
}
