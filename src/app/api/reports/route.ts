import { randomUUID } from 'node:crypto';
import { sessionUserId, type UserRow } from '@/lib/account';
import { ensureCompany } from '@/lib/company';
import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { byIds, col, isDatabaseConfigured, newestFirst, nowIso, rows } from '@/lib/db';
import { GeoSchema, ReportPayloadSchema, type ReportRow } from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/reports — archives one assessment report. */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: 'Database not configured.' },
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
  // Approximate submitter location from Vercel edge headers (absent locally and on App Hosting).
  const geo = GeoSchema.parse({
    country: request.headers.get('x-vercel-ip-country'),
    region: request.headers.get('x-vercel-ip-country-region'),
    city: request.headers.get('x-vercel-ip-city'),
  });

  const userId = await sessionUserId();
  // The company the assessment is for: its certificate and course belong to the whole team.
  const company = userId ? await ensureCompany(userId).catch(() => null) : null;

  try {
    const id = randomUUID();
    const report: Omit<ReportRow, 'id'> = {
      user_id: userId,
      app_id: p.appId ?? null,
      startup_name: p.startupName,
      profile: p.profile,
      company_info: p.companyInfo ?? null,
      answers: p.answers,
      scores: p.scores,
      final_score: p.finalScore,
      band: p.band,
      country: geo.country ?? null,
      region: geo.region ?? null,
      city: decodeURIComponent(geo.city ?? '') || null,
      created_at: nowIso(),
      ...(company ? { company_id: company.id } : {}),
    };
    await col('reports').doc(id).create(report);
    return Response.json({ id, report: { id, ...report } }, { status: 201 });
  } catch (error) {
    console.error('Failed to save iSTARTUP report:', error);
    return Response.json({ error: 'Failed to save report.' }, { status: 500 });
  }
}

/** GET /api/reports?appId=PN-001&limit=20 — admin-only list of reports, newest first. */
export async function GET(request: Request) {
  if (!(await currentAdmin())) return unauthorized();

  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: 'Database not configured.' },
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
    const fields = ['user_id', 'app_id', 'startup_name', 'final_score', 'band', 'scores', 'country', 'region', 'city', 'created_at'];
    // Filtered lists sort in memory so no composite (app_id, created_at) index is needed.
    const reports = appId
      ? (await rows<ReportRow>(col('reports').where('app_id', '==', appId).select(...fields)))
          .sort(newestFirst)
          .slice(0, limit)
      : await rows<ReportRow>(col('reports').orderBy('created_at', 'desc').limit(limit).select(...fields));
    const users = await byIds<UserRow>('users', reports.flatMap((r) => (r.user_id ? [r.user_id] : [])));
    return Response.json({
      reports: reports.map((r) => {
        const u = r.user_id ? users.get(r.user_id) : undefined;
        return { ...r, user_email: u?.email ?? null, user_name: u?.full_name ?? null };
      }),
    });
  } catch (error) {
    console.error('Failed to list iSTARTUP reports:', error);
    return Response.json({ error: 'Failed to list reports.' }, { status: 500 });
  }
}
