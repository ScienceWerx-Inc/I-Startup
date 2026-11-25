import { getUser, sessionUserId } from '@/lib/account';
import { col, isDatabaseConfigured, nowIso } from '@/lib/db';
import { emailVerifyTokenMatches, readEmailVerifyToken } from '@/lib/email-verification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Back into the app with the outcome for the banner (`/learn?email=verified|invalid`);
 * through sign-in first when this browser isn't signed in (the email may be opened anywhere).
 */
async function back(outcome: 'verified' | 'invalid') {
  const target = `/learn?email=${outcome}`;
  const signedIn = Boolean(await sessionUserId());
  // A relative Location: behind App Hosting's proxy, request.url's host may be an internal one.
  const location = signedIn ? target : `/sign-in?next=${encodeURIComponent(target)}`;
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

/**
 * GET /api/auth/verify-email?token= — the link in the verification email. Marks the
 * account's current email as verified when the token is genuine, unexpired, and was
 * issued for this account at this address. Idempotent.
 */
export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return back('invalid');
  const token = new URL(request.url).searchParams.get('token');
  const read = await readEmailVerifyToken(token).catch(() => null);
  if (!read) return back('invalid');
  try {
    const user = await getUser(read.userId);
    if (!user || !(await emailVerifyTokenMatches(token, user))) return back('invalid');
    if (!user.email_verified_at) await col('users').doc(user.id).update({ email_verified_at: nowIso() });
    return back('verified');
  } catch (error) {
    console.error('Email verification failed:', error instanceof Error ? error.message : 'unknown error');
    return back('invalid');
  }
}
