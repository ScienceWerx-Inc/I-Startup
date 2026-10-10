import { markPaid, verifyStripeSignature } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/stripe — marks purchases paid even if the founder closes the tab
 * before the success redirect. Configure the endpoint in Stripe for
 * `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: 'Webhook secret not configured.' }, { status: 503 });

  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get('stripe-signature'), secret)) {
    return Response.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    type: string;
    data: { object: { id: string; payment_status?: string } };
  };
  if (
    (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') &&
    event.data.object.payment_status === 'paid'
  ) {
    try {
      await markPaid(event.data.object.id);
    } catch (error) {
      console.error('Failed to record Stripe payment:', error);
      return Response.json({ error: 'Failed to record payment.' }, { status: 500 });
    }
  }
  return Response.json({ received: true });
}
