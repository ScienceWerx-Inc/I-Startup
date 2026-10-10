import { createHmac, timingSafeEqual } from 'node:crypto';
import { sql } from '@vercel/postgres';

import { ensureAuthTables } from '@/lib/db';

/**
 * What founders can buy, and how they pay for it.
 *
 * Provider: Stripe Checkout over its REST API (no SDK) when `STRIPE_SECRET_KEY` is set.
 * Without it, `PAYMENTS_MODE=mock` (or any non-production build) completes purchases
 * instantly so the flow can be exercised end to end; otherwise checkout is disabled.
 *
 * Entitlements are per user, not per report: unlocking the full report once unlocks it
 * for every assessment that founder takes, so editing answers never re-locks a report.
 */

export type Product = 'report' | 'course';
export const PRODUCTS: Product[] = ['report', 'course'];

export interface Price {
  name: string;
  description: string;
  amountCents: number;
  currency: string;
}

function cents(envValue: string | undefined, fallback: number): number {
  const n = Number.parseInt(envValue ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function prices(): Record<Product, Price> {
  const currency = (process.env.PAYMENTS_CURRENCY || 'usd').toLowerCase();
  return {
    report: {
      name: 'iSTARTUP Score — Full Report',
      description: 'Dimension breakdown, strengths, critical gaps, ranked priority actions and PDF export.',
      amountCents: cents(process.env.REPORT_PRICE_CENTS, 4900),
      currency,
    },
    course: {
      name: 'iSTARTUP Gap-Closing Course + 01 Certification',
      description: 'A course built around the gaps your assessment found. Certified with the 01 Certification on completion.',
      amountCents: cents(process.env.COURSE_PRICE_CENTS, 19900),
      currency,
    },
  };
}

export type PaymentsMode = 'stripe' | 'mock' | 'disabled';

export function paymentsMode(): PaymentsMode {
  if (process.env.STRIPE_SECRET_KEY) return 'stripe';
  if (process.env.PAYMENTS_MODE === 'mock' || process.env.NODE_ENV !== 'production') return 'mock';
  return 'disabled';
}

export async function entitlements(userId: string): Promise<Record<Product, boolean>> {
  await ensureAuthTables();
  const { rows } = await sql<{ product: string }>`
    SELECT DISTINCT product FROM istartup_purchases
    WHERE user_id = ${userId}::uuid AND status = 'paid';
  `;
  const owned = new Set(rows.map((r) => r.product));
  return { report: owned.has('report'), course: owned.has('course') };
}

export async function recordPurchase(p: {
  userId: string;
  reportId: string | null;
  product: Product;
  provider: 'stripe' | 'mock';
  providerRef: string | null;
  paid: boolean;
}): Promise<void> {
  const price = prices()[p.product];
  await sql`
    INSERT INTO istartup_purchases
      (user_id, report_id, product, status, provider, provider_ref, amount_cents, currency, paid_at)
    VALUES (
      ${p.userId}::uuid, ${p.reportId}::uuid, ${p.product}, ${p.paid ? 'paid' : 'pending'},
      ${p.provider}, ${p.providerRef}, ${price.amountCents}, ${price.currency},
      ${p.paid ? new Date().toISOString() : null}
    );
  `;
}

/** Marks a Stripe-backed purchase paid. Idempotent — the redirect and the webhook both call it. */
export async function markPaid(providerRef: string): Promise<void> {
  await ensureAuthTables();
  await sql`
    UPDATE istartup_purchases SET status = 'paid', paid_at = NOW()
    WHERE provider_ref = ${providerRef} AND status <> 'paid';
  `;
}

/* ─────────────────────────────── Stripe ─────────────────────────────── */

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  metadata: Record<string, string>;
}

async function stripe<T>(path: string, init?: { body: URLSearchParams }): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(init ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: init?.body,
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path} failed: ${data?.error?.message ?? res.status}`);
  return data as T;
}

export function createStripeCheckout(o: {
  product: Product;
  userId: string;
  email: string;
  reportId: string | null;
  origin: string;
}): Promise<StripeCheckoutSession> {
  const price = prices()[o.product];
  const body = new URLSearchParams({
    mode: 'payment',
    customer_email: o.email,
    client_reference_id: o.userId,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': price.currency,
    'line_items[0][price_data][unit_amount]': String(price.amountCents),
    'line_items[0][price_data][product_data][name]': price.name,
    'line_items[0][price_data][product_data][description]': price.description,
    'metadata[user_id]': o.userId,
    'metadata[product]': o.product,
    success_url: `${o.origin}/interview?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${o.origin}/interview?checkout=cancelled`,
  });
  if (o.reportId) body.set('metadata[report_id]', o.reportId);
  return stripe<StripeCheckoutSession>('checkout/sessions', { body });
}

export function retrieveStripeCheckout(id: string): Promise<StripeCheckoutSession> {
  return stripe<StripeCheckoutSession>(`checkout/sessions/${encodeURIComponent(id)}`);
}

/** Verifies a `Stripe-Signature` header against the raw body (5-minute tolerance). */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((kv) => kv.split('=') as [string, string]),
  );
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest();
  return header
    .split(',')
    .filter((kv) => kv.startsWith('v1='))
    .some((kv) => {
      const sig = Buffer.from(kv.slice(3), 'hex');
      return sig.length === expected.length && timingSafeEqual(sig, expected);
    });
}
