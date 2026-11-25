import { FieldValue } from 'firebase-admin/firestore';

import { currentUser } from '@/lib/account';
import { col, isDatabaseConfigured } from '@/lib/db';
import { userCookieHeader } from '@/lib/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/sign-out — clears the founder session.
 * With `?everywhere=1` it also bumps the account's `session_version`, which revokes every
 * session cookie signed for it so far (other browsers and devices included).
 */
export async function POST(request: Request) {
  const clear = { 'Set-Cookie': userCookieHeader('', 0) };
  if (new URL(request.url).searchParams.get('everywhere') !== '1') {
    return Response.json({ ok: true }, { headers: clear });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'Database not configured.' }, { status: 503 });
  }
  try {
    const user = await currentUser();
    if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401, headers: clear });
    await col('users').doc(user.id).update({ session_version: FieldValue.increment(1) });
    return Response.json({ ok: true, everywhere: true }, { headers: clear });
  } catch (error) {
    console.error('Sign-out everywhere failed:', error);
    return Response.json({ error: 'Could not sign out other sessions. Please try again.' }, { status: 500 });
  }
}
