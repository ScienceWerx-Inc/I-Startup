import { currentUser } from '@/lib/account';
import { entitlements, markPaid, paymentsMode, retrieveStripeCheckout } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/checkout/verify?session_id=cs_… — called when Stripe redirects back, so access
 * unlocks immediately instead of waiting for the webhook. Returns the user's access.
 */
export async function GET(request: Request) {
  const user = await currentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  const sessionId = new URL(request.url).searchParams.get('session_id');
  try {
    if (sessionId && paymentsMode() === 'stripe') {
      const session = await retrieveStripeCheckout(sessionId);
      if (session.payment_status === 'paid' && session.metadata?.user_id === user.id) {
        await markPaid(session.id);
      }
    }
    return Response.json({ access: await entitlements(user.id) });
  } catch (error) {
    console.error('Checkout verification failed:', error);
    return Response.json({ error: 'Could not confirm your payment yet.' }, { status: 502 });
  }
}
