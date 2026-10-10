import { sql } from '@vercel/postgres';
import { z } from 'zod';

import { normalizeEmail, toPublicUser, type UserRow } from '@/lib/account';
import { ensureAuthTables, isDatabaseConfigured } from '@/lib/db';
import { DUMMY_HASH, verifyPassword } from '@/lib/passwords';
import { signUserSession, userCookieHeader } from '@/lib/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SignInSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

/** POST /api/auth/sign-in — email + password, sets the founder session cookie. */
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
  const parsed = SignInSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Email and password required.' }, { status: 400 });
  }

  try {
    await ensureAuthTables();
    const { rows } = await sql<UserRow & { password_hash: string }>`
      SELECT id, email, full_name, onboarding, created_at, password_hash
      FROM istartup_users WHERE email = ${normalizeEmail(parsed.data.email)} LIMIT 1;
    `;
    const user = rows[0];
    // Hash even when the email is unknown so response time doesn't reveal which emails exist.
    const ok = await verifyPassword(parsed.data.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) {
      return Response.json({ error: 'Incorrect email or password.' }, { status: 401 });
    }
    await sql`UPDATE istartup_users SET last_login_at = NOW() WHERE id = ${user.id}::uuid;`;
    const token = await signUserSession(user.id);
    return Response.json(
      { user: toPublicUser(user) },
      { headers: { 'Set-Cookie': userCookieHeader(token) } },
    );
  } catch (error) {
    console.error('Sign-in failed:', error);
    return Response.json({ error: 'Could not sign you in. Please try again.' }, { status: 500 });
  }
}
