import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import { sessionUserId } from '@/lib/account';
import { ADMIN_COOKIE, adminSecret, verifySession } from '@/lib/admin-auth';
import { ensureAuthTables, isDatabaseConfigured } from '@/lib/db';
import { GeoSchema, ReportPayloadSchema, type ReportRow } from '@/lib/reports';

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
  // Approximate submitter location from Vercel edge headers (absent locally).
  const geo = GeoSchema.parse({
    country: request.headers.get('x-vercel-ip-country'),
    region: request.headers.get('x-vercel-ip-country-region'),
    city: request.headers.get('x-vercel-ip-city'),
  });

  const userId = await sessionUserId();

  try {
    await ensureAuthTables();
    const { rows } = await sql<ReportRow>`
      INSERT INTO istartup_reports
        (user_id, app_id, startup_name, profile, company_info, answers, scores, final_score, band, country, region, city)
      VALUES
        (
          ${userId}::uuid,
          ${p.appId ?? null},
          ${p.startupName},
          ${JSON.stringify(p.profile)}::jsonb,
          ${p.companyInfo == null ? null : JSON.stringify(p.companyInfo)}::jsonb,
          ${JSON.stringify(p.answers)}::jsonb,
          ${JSON.stringify(p.scores)}::jsonb,
          ${p.finalScore},
          ${p.band},
          ${geo.country ?? null},
          ${geo.region ?? null},
          ${decodeURIComponent(geo.city ?? '') || null}
        )
      RETURNING id, app_id, startup_name, profile, company_info, answers, scores, final_score, band, country, region, city, created_at;
    `;
    return Response.json({ id: rows[0].id, report: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to save iSTARTUP report:', error);
    return Response.json({ error: 'Failed to save report.' }, { status: 500 });
  }
}

/** GET /api/reports?appId=PN-001&limit=20 — admin-only list of reports, newest first. */
export async function GET(request: Request) {
  const store = await cookies();
  const admin = await verifySession(store.get(ADMIN_COOKIE)?.value, adminSecret());
  if (!admin) return Response.json({ error: 'Unauthorized.' }, { status: 401 });

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
    1000,
  );

  try {
    await ensureAuthTables();
    const { rows } = appId
      ? await sql<ReportRow>`
          SELECT r.id, r.app_id, r.startup_name, r.final_score, r.band, r.country, r.region, r.city, r.created_at,
                 r.user_id, u.email AS user_email, u.full_name AS user_name
          FROM istartup_reports r LEFT JOIN istartup_users u ON u.id = r.user_id
          WHERE r.app_id = ${appId}
          ORDER BY r.created_at DESC
          LIMIT ${limit};
        `
      : await sql<ReportRow>`
          SELECT r.id, r.app_id, r.startup_name, r.final_score, r.band, r.country, r.region, r.city, r.created_at,
                 r.user_id, u.email AS user_email, u.full_name AS user_name
          FROM istartup_reports r LEFT JOIN istartup_users u ON u.id = r.user_id
          ORDER BY r.created_at DESC
          LIMIT ${limit};
        `;
    return Response.json({ reports: rows });
  } catch (error) {
    console.error('Failed to list iSTARTUP reports:', error);
    return Response.json({ error: 'Failed to list reports.' }, { status: 500 });
  }
}
