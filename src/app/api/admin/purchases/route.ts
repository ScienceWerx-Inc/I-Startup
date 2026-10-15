import type { UserRow } from '@/lib/account';
import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { byIds, col, isDatabaseConfigured, rows } from '@/lib/db';
import type { PurchaseRow } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/purchases — every checkout (paid and pending), newest first, up to 1000. */
export async function GET() {
  if (!(await currentAdmin())) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });

  try {
    const purchases = await rows<PurchaseRow>(col('purchases').orderBy('created_at', 'desc').limit(1000));
    const users = await byIds<UserRow>('users', purchases.map((p) => p.user_id));
    return Response.json({
      purchases: purchases
        .filter((p) => users.has(p.user_id))
        .map((p) => {
          const u = users.get(p.user_id)!;
          return { ...p, email: u.email, full_name: u.full_name };
        }),
    });
  } catch (error) {
    console.error('Failed to list purchases:', error);
    return Response.json({ error: 'Failed to list purchases.' }, { status: 500 });
  }
}
