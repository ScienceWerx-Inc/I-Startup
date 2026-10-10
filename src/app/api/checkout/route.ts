import { sql } from '@vercel/postgres';
import { z } from 'zod';

import { currentUser } from '@/lib/account';
import {
  PRODUCTS,
  createStripeCheckout,
  entitlements,
  paymentsMode,
  recordPurchase,
} from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CheckoutSchema = z.object({
  product: z.enum(PRODUCTS as [string, ...string[]]),
  reportId: z.string().uuid().nullish(),
});

/**
 * POST /api/checkout — starts a purchase of the full report or the course.
 * Returns `{ url }` to send the browser to (Stripe Checkout, or straight back in mock mode).
 */
export async function POST(request: Request) {
  const user = await currentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Unknown product.' }, { status: 400 });

  const product = parsed.data.product as 'report' | 'course';
  const mode = paymentsMode();
  if (mode === 'disabled') {
    return Response.json({ error: 'Payments are not available yet.' }, { status: 503 });
  }

  try {
    if ((await entitlements(user.id))[product]) {
      return Response.json({ url: '/interview?checkout=success', alreadyOwned: true });
    }

    // Only attach a report the user actually owns.
    let reportId: string | null = null;
    if (parsed.data.reportId) {
      const { rows } = await sql`
        SELECT id FROM istartup_reports
        WHERE id = ${parsed.data.reportId}::uuid AND user_id = ${user.id}::uuid LIMIT 1;
      `;
      reportId = rows[0]?.id ?? null;
    }

    if (mode === 'mock') {
      await recordPurchase({ userId: user.id, reportId, product, provider: 'mock', providerRef: null, paid: true });
      return Response.json({ url: '/interview?checkout=success' });
    }

    const origin = process.env.APP_URL?.replace(/\/$/, '') || new URL(request.url).origin;
    const session = await createStripeCheckout({ product, userId: user.id, email: user.email, reportId, origin });
    await recordPurchase({ userId: user.id, reportId, product, provider: 'stripe', providerRef: session.id, paid: false });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('Checkout failed:', error);
    return Response.json({ error: 'Could not start checkout. Please try again.' }, { status: 500 });
  }
}
