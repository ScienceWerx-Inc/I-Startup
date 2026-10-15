import type { UserRow } from '@/lib/account';
import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { col, isDatabaseConfigured, rows } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/users — every founder (newest first, up to 1000) with activity and purchases. */
export async function GET() {
  if (!(await currentAdmin())) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });

  try {
    const [users, reports, paid] = await Promise.all([
      rows<UserRow>(
        col('users')
          .orderBy('created_at', 'desc')
          .limit(1000)
          .select('email', 'full_name', 'onboarding', 'created_at', 'last_login_at'),
      ),
      rows<{ user_id: string | null; final_score: number; created_at: string }>(
        col('reports').select('user_id', 'final_score', 'created_at'),
      ),
      rows<{ user_id: string; product: string; amount_cents: number }>(
        col('purchases').where('status', '==', 'paid').select('user_id', 'product', 'amount_cents'),
      ),
    ]);

    const activity = new Map<string, { count: number; latest: { score: number; at: string } | null }>();
    for (const r of reports) {
      if (!r.user_id) continue;
      const a = activity.get(r.user_id) ?? { count: 0, latest: null };
      a.count += 1;
      if (!a.latest || r.created_at > a.latest.at) a.latest = { score: r.final_score, at: r.created_at };
      activity.set(r.user_id, a);
    }
    const spend = new Map<string, { products: Set<string>; cents: number }>();
    for (const p of paid) {
      const s = spend.get(p.user_id) ?? { products: new Set<string>(), cents: 0 };
      s.products.add(p.product);
      s.cents += p.amount_cents ?? 0;
      spend.set(p.user_id, s);
    }

    return Response.json({
      users: users.map((u) => ({
        ...u,
        last_login_at: u.last_login_at ?? null,
        report_count: activity.get(u.id)?.count ?? 0,
        latest_score: activity.get(u.id)?.latest?.score ?? null,
        products: [...(spend.get(u.id)?.products ?? [])],
        paid_cents: spend.get(u.id)?.cents ?? 0,
      })),
    });
  } catch (error) {
    console.error('Failed to list users:', error);
    return Response.json({ error: 'Failed to list founders.' }, { status: 500 });
  }
}
