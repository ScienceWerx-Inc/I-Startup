import { sql } from '@vercel/postgres';

import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { ensureAuthTables, isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/users — every founder (newest first, up to 1000) with activity and purchases. */
export async function GET() {
  if (!(await currentAdmin())) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });

  try {
    await ensureAuthTables();
    const { rows } = await sql`
      SELECT
        u.id, u.email, u.full_name, u.onboarding, u.created_at, u.last_login_at,
        (SELECT COUNT(*) FROM istartup_reports r WHERE r.user_id = u.id)::int AS report_count,
        (SELECT r.final_score FROM istartup_reports r WHERE r.user_id = u.id ORDER BY r.created_at DESC LIMIT 1) AS latest_score,
        COALESCE(
          (SELECT array_agg(DISTINCT p.product) FROM istartup_purchases p WHERE p.user_id = u.id AND p.status = 'paid'),
          '{}'
        ) AS products,
        (SELECT COALESCE(SUM(p.amount_cents), 0) FROM istartup_purchases p WHERE p.user_id = u.id AND p.status = 'paid')::int AS paid_cents
      FROM istartup_users u
      ORDER BY u.created_at DESC
      LIMIT 1000;
    `;
    return Response.json({ users: rows });
  } catch (error) {
    console.error('Failed to list users:', error);
    return Response.json({ error: 'Failed to list founders.' }, { status: 500 });
  }
}
