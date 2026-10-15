import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { normalizeEmail, toPublicUser, type StoredUser } from '@/lib/account';
import { col, db, emailKey, isAlreadyExists, isDatabaseConfigured, nowIso } from '@/lib/db';
import { hashPassword } from '@/lib/passwords';
import { signUserSession, userCookieHeader } from '@/lib/user-auth';
import { OnboardingSchema } from '@/modules/istartup-score/onboarding/fields';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SignUpSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(200),
  onboarding: OnboardingSchema.default({}),
});

/** POST /api/auth/sign-up — creates a founder account from the "Submit an idea" onboarding. */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'Database not configured.' }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = SignUpSchema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const message =
      field === 'password' ? 'Use a password of at least 8 characters.'
      : field === 'email' ? 'Enter a valid email address.'
      : field === 'fullName' ? 'Enter your name.'
      : 'Some answers could not be read. Please check them and try again.';
    return Response.json({ error: message }, { status: 400 });
  }

  const { fullName, password, onboarding } = parsed.data;
  const email = normalizeEmail(parsed.data.email);

  try {
    const id = randomUUID();
    const now = nowIso();
    const user: StoredUser = {
      email,
      password_hash: await hashPassword(password),
      full_name: fullName,
      onboarding,
      created_at: now,
      last_login_at: now,
    };
    // The email doc is the uniqueness guard: `create` fails the whole batch if it exists.
    const batch = db().batch();
    batch.create(col('userEmails').doc(emailKey(email)), { user_id: id });
    batch.create(col('users').doc(id), user);
    try {
      await batch.commit();
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
      return Response.json(
        { error: 'An account with this email already exists. Sign in instead.', code: 'email_taken' },
        { status: 409 },
      );
    }
    const token = await signUserSession(id);
    return Response.json(
      { user: toPublicUser({ id, ...user }) },
      { status: 201, headers: { 'Set-Cookie': userCookieHeader(token) } },
    );
  } catch (error) {
    console.error('Sign-up failed:', error);
    return Response.json({ error: 'Could not create your account. Please try again.' }, { status: 500 });
  }
}
