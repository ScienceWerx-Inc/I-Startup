import { sessionUserId } from '@/lib/account';
import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { col, isDatabaseConfigured, isId } from '@/lib/db';
import type { ReportRow } from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/reports/:id — fetches one archived report (admin, or the founder who owns it). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) {
    return Response.json(
      { error: 'Database not configured.' },
      { status: 503 },
    );
  }

  const admin = await currentAdmin();
  const userId = admin ? null : await sessionUserId();
  if (!admin && !userId) return Response.json({ error: 'Unauthorized.' }, { status: 401 });

  const { id } = await params;
  if (!id) return Response.json({ error: 'Missing id.' }, { status: 400 });
  if (!isId(id)) return Response.json({ error: 'Report not found.' }, { status: 404 });

  try {
    const snap = await col('reports').doc(id).get();
    const report = snap.exists ? ({ id: snap.id, ...snap.data() } as ReportRow) : null;
    // Someone else's report reads as missing, not forbidden.
    if (!report || (!admin && report.user_id !== userId)) {
      return Response.json({ error: 'Report not found.' }, { status: 404 });
    }
    return Response.json({ report });
  } catch (error) {
    console.error('Failed to fetch iSTARTUP report:', error);
    return Response.json({ error: 'Failed to fetch report.' }, { status: 500 });
  }
}

/** DELETE /api/reports/:id — admin-only removal of a report (e.g. test rows). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await currentAdmin())) return unauthorized();

  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const { id } = await params;
  if (!id) return Response.json({ error: 'Missing id.' }, { status: 400 });
  if (!isId(id)) return Response.json({ error: 'Report not found.' }, { status: 404 });

  try {
    const ref = col('reports').doc(id);
    if (!(await ref.get()).exists) return Response.json({ error: 'Report not found.' }, { status: 404 });
    await ref.delete();
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete iSTARTUP report:', error);
    return Response.json({ error: 'Failed to delete report.' }, { status: 500 });
  }
}
