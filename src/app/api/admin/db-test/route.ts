import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { col, isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/db-test — admin-only Firestore connectivity + reports collection check. */
export async function GET() {
  if (!(await currentAdmin())) return unauthorized();

  if (!isDatabaseConfigured()) {
    return Response.json(
      { configured: false, error: 'Firestore project not configured.' },
      { status: 503 },
    );
  }

  try {
    const reports = col('reports');
    const [count, latest] = await Promise.all([
      reports.count().get(),
      reports
        .orderBy('created_at', 'desc')
        .limit(5)
        .select('app_id', 'startup_name', 'final_score', 'band', 'created_at')
        .get(),
    ]);
    const n = count.data().count;
    return Response.json({
      configured: true,
      connected: true,
      tableExists: n > 0,
      count: n,
      latest: latest.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (error) {
    console.error('DB test failed:', error);
    return Response.json(
      { configured: true, connected: false, error: 'Connection or query failed.' },
      { status: 500 },
    );
  }
}
