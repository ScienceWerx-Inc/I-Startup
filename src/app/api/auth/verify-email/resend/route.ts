import { currentUser } from '@/lib/account';
import { linkOrigin, reserveResend, sendVerificationEmail } from '@/lib/email-verification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/verify-email/resend — emails the signed-in founder a fresh link (3 per hour). */
export async function POST(request: Request) {
  const user = await currentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (user.email_verified_at) return Response.json({ ok: true, alreadyVerified: true });

  try {
    const slot = await reserveResend(user.id);
    if (!slot.ok) {
      return Response.json(
        { error: 'You have asked for 3 emails in the last hour. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(slot.retryAfterS) } },
      );
    }
    const result = await sendVerificationEmail(user, linkOrigin(request));
    if (result === 'failed') return Response.json({ error: 'Could not send the email. Please try again.' }, { status: 502 });
    return Response.json({ ok: true, sent: result === 'sent' });
  } catch (error) {
    console.error('Verification resend failed:', error instanceof Error ? error.message : 'unknown error');
    return Response.json({ error: 'Could not send the email. Please try again.' }, { status: 500 });
  }
}
