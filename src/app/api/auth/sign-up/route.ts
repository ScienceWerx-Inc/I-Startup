import { sql } from '@vercel/postgres';
import { z } from 'zod';

import { normalizeEmail, toPublicUser, type UserRow } from '@/lib/account';
import { ensureAuthTables, isDatabaseConfigured } from '@/lib/db';
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
    await ensureAuthTables();
    const passwordHash = await hashPassword(password);
    const { rows } = await sql<UserRow>`
      INSERT INTO istartup_users (email, password_hash, full_name, onboarding, last_login_at)
      VALUES (${email}, ${passwordHash}, ${fullName}, ${JSON.stringify(onboarding)}::jsonb, NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, full_name, onboarding, created_at;
    `;
    if (rows.length === 0) {
      return Response.json(
        { error: 'An account with this email already exists. Sign in instead.', code: 'email_taken' },
        { status: 409 },
      );
    }
    const token = await signUserSession(rows[0].id);
    return Response.json(
      { user: toPublicUser(rows[0]) },
      { status: 201, headers: { 'Set-Cookie': userCookieHeader(token) } },
    );
  } catch (error) {
    console.error('Sign-up failed:', error);
    return Response.json({ error: 'Could not create your account. Please try again.' }, { status: 500 });
  }
}
