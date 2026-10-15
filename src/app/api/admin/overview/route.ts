import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { col, isDatabaseConfigured } from '@/lib/db';
import { paymentsMode } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Onboarding answers broken down on the overview, in display order. */
const BREAKDOWNS = [
  { key: 'sector', label: 'Kind of startup' },
  { key: 'businessModel', label: 'Business model' },
  { key: 'stage', label: 'Stage' },
  { key: 'foundedYear', label: 'Founded' },
  { key: 'founders', label: 'Founders' },
  { key: 'role', label: 'Role' },
  { key: 'teamSize', label: 'Team size' },
  { key: 'funding', label: 'Funding to date' },
  { key: 'goal', label: 'Goal' },
  { key: 'country', label: 'Country (self-reported)' },
] as const;

/** Upper bound on documents scanned per collection; aggregates are computed in memory. */
const SCAN_LIMIT = 10_000;
const DAY_MS = 24 * 60 * 60 * 1000;

const countBy = (values: string[]) => {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
};

/**
 * GET /api/admin/overview — admin-only founder/funnel/revenue aggregates, onboarding
 * breakdowns, and which integrations are configured (booleans only, never values).
 */
export async function GET() {
  if (!(await currentAdmin())) return unauthorized();

  const config = {
    database: isDatabaseConfigured(),
    authSecret: Boolean(process.env.AUTH_SECRET),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    appUrl: process.env.APP_URL ?? null,
    payments: paymentsMode(),
    reportPriceCents: Number(process.env.REPORT_PRICE_CENTS) || 4900,
    coursePriceCents: Number(process.env.COURSE_PRICE_CENTS) || 19900,
  };
  if (!config.database) return Response.json({ config, error: 'Database not configured.' }, { status: 503 });

  try {
    const [userSnap, reportSnap, purchaseSnap] = await Promise.all([
      col('users').select('created_at', 'onboarding').limit(SCAN_LIMIT).get(),
      col('reports').select('user_id').limit(SCAN_LIMIT).get(),
      col('purchases')
        .select('user_id', 'product', 'status', 'provider', 'currency', 'amount_cents')
        .limit(SCAN_LIMIT)
        .get(),
    ]);
    const users = userSnap.docs.map((d) => d.data() as { created_at: string; onboarding?: Record<string, unknown> });
    const reports = reportSnap.docs.map((d) => d.data() as { user_id: string | null });
    const purchases = purchaseSnap.docs.map(
      (d) =>
        d.data() as {
          user_id: string;
          product: string;
          status: string;
          provider: string;
          currency: string;
          amount_cents: number;
        },
    );
    const paid = purchases.filter((p) => p.status === 'paid');
    const paidUsers = (product: string) =>
      new Set(paid.filter((p) => p.product === product).map((p) => p.user_id)).size;

    const now = Date.now();
    const since = (days: number) => new Date(now - days * DAY_MS).toISOString();

    const funnel = {
      users: users.length,
      users_7d: users.filter((u) => u.created_at > since(7)).length,
      assessed: new Set(reports.map((r) => r.user_id).filter(Boolean)).size,
      reports: reports.length,
      anon_reports: reports.filter((r) => !r.user_id).length,
      paid_report: paidUsers('report'),
      paid_course: paidUsers('course'),
      pending: purchases.filter((p) => p.status === 'pending').length,
    };

    const revenueGroups = new Map<string, { product: string; currency: string; provider: string; count: number; cents: number }>();
    for (const p of paid) {
      const key = `${p.product}|${p.currency}|${p.provider}`;
      const g = revenueGroups.get(key) ?? { product: p.product, currency: p.currency, provider: p.provider, count: 0, cents: 0 };
      g.count += 1;
      g.cents += p.amount_cents ?? 0;
      revenueGroups.set(key, g);
    }

    const signupsByDay = [...countBy(users.filter((u) => u.created_at > since(30)).map((u) => u.created_at.slice(0, 10)))]
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => (a.day < b.day ? -1 : 1));

    const breakdowns = BREAKDOWNS.map((b) => {
      const labels = users.map((u) => String(u.onboarding?.[b.key] ?? '').trim() || 'Not answered');
      const rows = [...countBy(labels)]
        .map(([label, count]) => ({ label, count }))
        .sort((x, y) => y.count - x.count)
        .slice(0, 10);
      return { key: b.key, label: b.label, rows };
    });

    return Response.json({ config, funnel, revenue: [...revenueGroups.values()], signupsByDay, breakdowns });
  } catch (error) {
    console.error('Failed to compute admin overview:', error);
    return Response.json({ config, error: 'Failed to compute overview.' }, { status: 500 });
  }
}
