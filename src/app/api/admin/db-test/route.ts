import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import { ADMIN_COOKIE, adminSecret, verifySession } from '@/lib/admin-auth';
import { ensureReportsTable, isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/db-test — admin-only connectivity + table check for Postgres. */
export async function GET() {
  const store = await cookies();
  const user = await verifySession(store.get(ADMIN_COOKIE)?.value, adminSecret());
  if (!user) return Response.json({ error: 'Unauthorized.' }, { status: 401 });

  if (!isDatabaseConfigured()) {
    return Response.json(
      { configured: false, error: 'POSTGRES_URL missing.' },
      { status: 503 },
    );
  }

  try {
    await sql`SELECT 1 AS ok;`;
    await ensureReportsTable();
    const reg = await sql<{ exists: boolean }>`
      SELECT to_regclass('public.istartup_reports') IS NOT NULL AS exists;
    `;
    const count = await sql<{ count: string }>`
      SELECT COUNT(*)::text AS count FROM istartup_reports;
    `;
    const latest = await sql`
      SELECT id, app_id, startup_name, final_score, band, created_at
      FROM istartup_reports
      ORDER BY created_at DESC
      LIMIT 5;
    `;
    return Response.json({
      configured: true,
      connected: true,
      tableExists: reg.rows[0].exists,
      count: Number(count.rows[0].count),
      latest: latest.rows,
    });
  } catch (error) {
    console.error('DB test failed:', error);
    return Response.json(
      { configured: true, connected: false, error: 'Connection or query failed.' },
      { status: 500 },
    );
  }
}
