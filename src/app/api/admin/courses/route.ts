import type { UserRow } from '@/lib/account';
import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { byIds, isDatabaseConfigured } from '@/lib/db';
import { listAllJobs } from '@/lib/gap-course/service';
import { listCourseCards } from '@/lib/gap-course/view';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/courses — every generated gap-closing course (newest first, up to 500) with its founder and progress. */
export async function GET() {
  if (!(await currentAdmin())) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });

  try {
    const jobs = await listAllJobs(500);
    const [cards, users] = await Promise.all([
      listCourseCards(jobs),
      byIds<UserRow>('users', jobs.map((j) => j.user_id)),
    ]);
    return Response.json({
      courses: cards.map((c) => {
        const u = users.get(c.userId);
        return { ...c, user_email: u?.email ?? null, user_name: u?.full_name ?? null };
      }),
    });
  } catch (error) {
    console.error('Failed to list courses:', error);
    return Response.json({ error: 'Failed to list courses.' }, { status: 500 });
  }
}
