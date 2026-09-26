import { sql } from '@vercel/postgres';
import { ensureReportsTable, isDatabaseConfigured } from '@/lib/db';
import type { ReportRow } from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/reports/:id — fetches one archived report. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: 'Database not configured. Set POSTGRES_URL in Vercel Storage.' },
      { status: 503 },
    );
  }

  const { id } = await params;
  if (!id) return Response.json({ error: 'Missing id.' }, { status: 400 });

  try {
    await ensureReportsTable();
    const { rows } = await sql<ReportRow>`
      SELECT id, app_id, startup_name, profile, company_info, answers, scores, final_score, band, created_at
      FROM istartup_reports
      WHERE id = ${id}::uuid
      LIMIT 1;
    `;
    if (rows.length === 0) {
      return Response.json({ error: 'Report not found.' }, { status: 404 });
    }
    return Response.json({ report: rows[0] });
  } catch (error) {
    console.error('Failed to fetch iSTARTUP report:', error);
    return Response.json({ error: 'Failed to fetch report.' }, { status: 500 });
  }
}
