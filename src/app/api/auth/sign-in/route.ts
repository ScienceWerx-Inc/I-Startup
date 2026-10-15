import { z } from 'zod';

import { normalizeEmail, toPublicUser, type StoredUser } from '@/lib/account';
import { col, isDatabaseConfigured, nowIso } from '@/lib/db';
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
    const snap = await col('users')
      .where('email', '==', normalizeEmail(parsed.data.email))
      .limit(1)
      .get();
    const doc = snap.docs[0];
    const stored = doc?.data() as StoredUser | undefined;
    // Hash even when the email is unknown so response time doesn't reveal which emails exist.
    const ok = await verifyPassword(parsed.data.password, stored?.password_hash ?? DUMMY_HASH);
    if (!doc || !stored || !ok) {
      return Response.json({ error: 'Incorrect email or password.' }, { status: 401 });
    }
    await doc.ref.update({ last_login_at: nowIso() });
    const user = { id: doc.id, ...stored };
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
