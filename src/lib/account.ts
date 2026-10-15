import { cookies } from 'next/headers';

import { col } from '@/lib/db';
import { USER_COOKIE, verifyUserSession } from '@/lib/user-auth';
import type { OnboardingAnswers } from '@/modules/istartup-score/onboarding/fields';

/** Server-only account lookups for route handlers. */

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  onboarding: OnboardingAnswers;
  created_at: string;
  last_login_at?: string | null;
}

/** A user document as stored, including the password hash (never send this to a client). */
export type StoredUser = Omit<UserRow, 'id'> & { password_hash: string };

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  onboarding: OnboardingAnswers;
}

export const toPublicUser = (u: UserRow): PublicUser => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name,
  onboarding: u.onboarding ?? {},
});

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** The signed-in user's id from the session cookie, or null. Does not hit the database. */
export async function sessionUserId(): Promise<string | null> {
  const store = await cookies();
  return verifyUserSession(store.get(USER_COOKIE)?.value);
}

/** The signed-in user, or null when signed out or the account no longer exists. */
export async function currentUser(): Promise<UserRow | null> {
  const id = await sessionUserId();
  if (!id) return null;
  return getUser(id);
}

export async function getUser(id: string): Promise<UserRow | null> {
  const snap = await col('users').doc(id).get();
  if (!snap.exists) return null;
  const { password_hash: _hash, ...user } = snap.data() as StoredUser;
  return { id: snap.id, ...user };
}
