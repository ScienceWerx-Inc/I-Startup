import { sql } from '@vercel/postgres';
import { ensureReportsTable, isDatabaseConfigured } from '@/lib/db';
import { ReportPayloadSchema, type ReportRow } from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/reports — archives one assessment report. */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: 'Database not configured. Set POSTGRES_URL in Vercel Storage.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = ReportPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid report payload.', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const p = parsed.data;

  try {
    await ensureReportsTable();
    const { rows } = await sql<ReportRow>`
      INSERT INTO istartup_reports
        (app_id, startup_name, profile, company_info, answers, scores, final_score, band)
      VALUES
        (
          ${p.appId ?? null},
          ${p.startupName},
          ${JSON.stringify(p.profile)}::jsonb,
          ${p.companyInfo == null ? null : JSON.stringify(p.companyInfo)}::jsonb,
          ${JSON.stringify(p.answers)}::jsonb,
          ${JSON.stringify(p.scores)}::jsonb,
          ${p.finalScore},
          ${p.band}
        )
      RETURNING id, app_id, startup_name, profile, company_info, answers, scores, final_score, band, created_at;
    `;
    return Response.json({ id: rows[0].id, report: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to save iSTARTUP report:', error);
    return Response.json({ error: 'Failed to save report.' }, { status: 500 });
  }
}

/** GET /api/reports?appId=PN-001&limit=20 — lists reports, newest first. */
export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: 'Database not configured. Set POSTGRES_URL in Vercel Storage.' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('appId');
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get('limit') ?? '20', 10) || 20, 1),
    100,
  );

  try {
    await ensureReportsTable();
    const { rows } = appId
      ? await sql<ReportRow>`
          SELECT id, app_id, startup_name, profile, company_info, answers, scores, final_score, band, created_at
          FROM istartup_reports
          WHERE app_id = ${appId}
          ORDER BY created_at DESC
          LIMIT ${limit};
        `
      : await sql<ReportRow>`
          SELECT id, app_id, startup_name, profile, company_info, answers, scores, final_score, band, created_at
          FROM istartup_reports
          ORDER BY created_at DESC
          LIMIT ${limit};
        `;
    return Response.json({ reports: rows });
  } catch (error) {
    console.error('Failed to list iSTARTUP reports:', error);
    return Response.json({ error: 'Failed to list reports.' }, { status: 500 });
  }
}
