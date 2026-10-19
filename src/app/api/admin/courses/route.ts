import type { UserRow } from '@/lib/account';
import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { byIds, isDatabaseConfigured } from '@/lib/db';
import { listCheckpointAnswers, scoreByCourse } from '@/lib/gap-course/checkpoints';
import { loadAttemptIndexes, quizScoreOf } from '@/lib/gap-course/quiz-scores';
import { listAllJobs } from '@/lib/gap-course/service';
import { listCourseCards } from '@/lib/gap-course/view';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/courses — every generated gap-closing course (newest first, up to 500) with its founder, progress and course score. */
export async function GET() {
  if (!(await currentAdmin())) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });

  try {
    const jobs = await listAllJobs(500);
    const [cards, users, answers, indexes] = await Promise.all([
      listCourseCards(jobs),
      byIds<UserRow>('users', jobs.map((j) => j.user_id)),
      listCheckpointAnswers(),
      loadAttemptIndexes(),
    ]);
    const scores = scoreByCourse(answers);
    const quizScores = new Map(jobs.map((j) => [j.course_id, quizScoreOf(j, indexes)]));
    return Response.json({
      courses: cards.map((c) => {
        const u = users.get(c.userId);
        return { ...c, courseScore: scores.get(c.courseId) ?? null, quizScore: quizScores.get(c.courseId) ?? null, user_email: u?.email ?? null, user_name: u?.full_name ?? null };
      }),
    });
  } catch (error) {
    console.error('Failed to list courses:', error);
    return Response.json({ error: 'Failed to list courses.' }, { status: 500 });
  }
}
