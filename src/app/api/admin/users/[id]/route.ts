import { getUser } from '@/lib/account';
import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { col, isDatabaseConfigured, isId, newestFirst, rows } from '@/lib/db';
import { listCheckpointAnswers, scoreByCourse } from '@/lib/gap-course/checkpoints';
import { loadAttemptIndexes, quizScoreOf } from '@/lib/gap-course/quiz-scores';
import { listJobs } from '@/lib/gap-course/service';
import { listCourseCards } from '@/lib/gap-course/view';
import type { PurchaseRow } from '@/lib/payments';
import type { ReportRow } from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/users/:id — one founder with all their reports, purchases and courses. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentAdmin())) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });

  const { id } = await params;
  if (!isId(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

  try {
    const [user, reports, purchases, jobs, answers, indexes] = await Promise.all([
      getUser(id),
      rows<ReportRow>(
        col('reports')
          .where('user_id', '==', id)
          .select('app_id', 'startup_name', 'final_score', 'band', 'scores', 'country', 'region', 'city', 'created_at'),
      ),
      rows<PurchaseRow>(col('purchases').where('user_id', '==', id)),
      listJobs(id),
      listCheckpointAnswers({ userId: id }),
      loadAttemptIndexes(id),
    ]);
    const scores = scoreByCourse(answers);
    if (!user) return Response.json({ error: 'Founder not found.' }, { status: 404 });
    return Response.json({
      user: { ...user, last_login_at: user.last_login_at ?? null },
      reports: reports.sort(newestFirst),
      purchases: purchases.sort(newestFirst).map(({ user_id: _u, ...p }) => p),
      courses: (await listCourseCards(jobs)).map((c, i) => ({
        ...c,
        courseScore: scores.get(c.courseId) ?? null,
        quizScore: quizScoreOf(jobs[i], indexes),
      })),
    });
  } catch (error) {
    console.error('Failed to load user:', error);
    return Response.json({ error: 'Failed to load founder.' }, { status: 500 });
  }
}
