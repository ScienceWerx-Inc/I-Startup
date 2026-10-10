import { sql } from '@vercel/postgres';

import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { ensureAuthTables, isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/users/:id — one founder with all their reports and purchases. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentAdmin())) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

  try {
    await ensureAuthTables();
    const [user, reports, purchases] = await Promise.all([
      sql`
        SELECT id, email, full_name, onboarding, created_at, last_login_at
        FROM istartup_users WHERE id = ${id}::uuid LIMIT 1;
      `,
      sql`
        SELECT id, app_id, startup_name, final_score, band, country, region, city, created_at
        FROM istartup_reports WHERE user_id = ${id}::uuid ORDER BY created_at DESC;
      `,
      sql`
        SELECT id, report_id, product, status, provider, provider_ref, amount_cents, currency, created_at, paid_at
        FROM istartup_purchases WHERE user_id = ${id}::uuid ORDER BY created_at DESC;
      `,
    ]);
    if (user.rows.length === 0) return Response.json({ error: 'Founder not found.' }, { status: 404 });
    return Response.json({ user: user.rows[0], reports: reports.rows, purchases: purchases.rows });
  } catch (error) {
    console.error('Failed to load user:', error);
    return Response.json({ error: 'Failed to load founder.' }, { status: 500 });
  }
}
