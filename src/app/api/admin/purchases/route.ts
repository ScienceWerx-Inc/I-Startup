import { sql } from '@vercel/postgres';

import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { ensureAuthTables, isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/purchases — every checkout (paid and pending), newest first, up to 1000. */
export async function GET() {
  if (!(await currentAdmin())) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });

  try {
    await ensureAuthTables();
    const { rows } = await sql`
      SELECT p.id, p.user_id, p.report_id, p.product, p.status, p.provider, p.provider_ref,
             p.amount_cents, p.currency, p.created_at, p.paid_at, u.email, u.full_name
      FROM istartup_purchases p
      JOIN istartup_users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 1000;
    `;
    return Response.json({ purchases: rows });
  } catch (error) {
    console.error('Failed to list purchases:', error);
    return Response.json({ error: 'Failed to list purchases.' }, { status: 500 });
  }
}
