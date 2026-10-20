import { randomUUID } from 'node:crypto';

import { normalizeEmail, type StoredUser, type UserRow } from '@/lib/account';
import { col, db, emailKey, isAlreadyExists, nowIso } from '@/lib/db';
import { hashPassword } from '@/lib/passwords';
import type { OnboardingAnswers } from '@/modules/istartup-score/onboarding/fields';

/**
 * Creates a founder account: the email document is the uniqueness guard (`create` fails
 * the whole batch if it exists). Shared by sign-up and by a co-founder accepting an invite.
 */
export async function createFounderAccount(input: {
  fullName: string;
  email: string;
  password: string;
  onboarding: OnboardingAnswers;
  companyId?: string;
}): Promise<{ ok: true; user: UserRow } | { ok: false; code: 'email_taken' }> {
  const id = randomUUID();
  const now = nowIso();
  const email = normalizeEmail(input.email);
  const user: StoredUser & { company_id?: string } = {
    email,
    password_hash: await hashPassword(input.password),
    full_name: input.fullName,
    onboarding: input.onboarding,
    created_at: now,
    last_login_at: now,
    ...(input.companyId ? { company_id: input.companyId } : {}),
  };
  const batch = db().batch();
  batch.create(col('userEmails').doc(emailKey(email)), { user_id: id });
  batch.create(col('users').doc(id), user);
  try {
    await batch.commit();
  } catch (error) {
    if (isAlreadyExists(error)) return { ok: false, code: 'email_taken' };
    throw error;
  }
  const { password_hash: _hash, ...row } = user;
  return { ok: true, user: { id, ...row } };
}
