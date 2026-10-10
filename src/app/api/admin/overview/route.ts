import { sql } from '@vercel/postgres';

import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { ensureAuthTables, isDatabaseConfigured } from '@/lib/db';
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
    await ensureAuthTables();

    const [funnel, revenue, signups, ...breakdowns] = await Promise.all([
      sql<{
        users: number;
        users_7d: number;
        assessed: number;
        reports: number;
        anon_reports: number;
        paid_report: number;
        paid_course: number;
        pending: number;
      }>`
        SELECT
          (SELECT COUNT(*) FROM istartup_users)::int AS users,
          (SELECT COUNT(*) FROM istartup_users WHERE created_at > NOW() - INTERVAL '7 days')::int AS users_7d,
          (SELECT COUNT(DISTINCT user_id) FROM istartup_reports WHERE user_id IS NOT NULL)::int AS assessed,
          (SELECT COUNT(*) FROM istartup_reports)::int AS reports,
          (SELECT COUNT(*) FROM istartup_reports WHERE user_id IS NULL)::int AS anon_reports,
          (SELECT COUNT(DISTINCT user_id) FROM istartup_purchases WHERE status = 'paid' AND product = 'report')::int AS paid_report,
          (SELECT COUNT(DISTINCT user_id) FROM istartup_purchases WHERE status = 'paid' AND product = 'course')::int AS paid_course,
          (SELECT COUNT(*) FROM istartup_purchases WHERE status = 'pending')::int AS pending;
      `,
      sql<{ product: string; currency: string; provider: string; count: number; cents: number }>`
        SELECT product, currency, provider, COUNT(*)::int AS count, COALESCE(SUM(amount_cents), 0)::int AS cents
        FROM istartup_purchases WHERE status = 'paid'
        GROUP BY product, currency, provider;
      `,
      sql<{ day: string; count: number }>`
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
        FROM istartup_users WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY 1 ORDER BY 1;
      `,
      ...BREAKDOWNS.map(
        (b) => sql<{ label: string; count: number }>`
          SELECT COALESCE(NULLIF(TRIM(onboarding->>${b.key}), ''), 'Not answered') AS label, COUNT(*)::int AS count
          FROM istartup_users GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
        `,
      ),
    ]);

    return Response.json({
      config,
      funnel: funnel.rows[0],
      revenue: revenue.rows,
      signupsByDay: signups.rows,
      breakdowns: BREAKDOWNS.map((b, i) => ({ key: b.key, label: b.label, rows: breakdowns[i].rows })),
    });
  } catch (error) {
    console.error('Failed to compute admin overview:', error);
    return Response.json({ config, error: 'Failed to compute overview.' }, { status: 500 });
  }
}
