import type { UserRow } from '@/lib/account';
import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import type { Company } from '@/lib/company';
import { byIds, col, isDatabaseConfigured } from '@/lib/db';
import type { CourseGrade } from '@/lib/gap-course/grades';
import { listCheckpointAnswers, scoreByCourse, scoreKey } from '@/lib/gap-course/checkpoints';
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
    const [cards, users, answers, indexes, companiesSnap, gradesSnap] = await Promise.all([
      listCourseCards(jobs),
      byIds<UserRow & { company_id?: string }>('users', jobs.map((j) => j.user_id)),
      listCheckpointAnswers(),
      loadAttemptIndexes(),
      col('companies').limit(5000).get(),
      col('courseGrades').limit(20_000).get(),
    ]);
    const companies = new Map(companiesSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Company]));
    const gradesByCourse = new Map<string, CourseGrade[]>();
    for (const d of gradesSnap.docs) {
      const g = d.data() as CourseGrade;
      gradesByCourse.set(g.course_id, [...(gradesByCourse.get(g.course_id) ?? []), g]);
    }
    // The team on each course: its company's joined founders, and their average grade.
    const teamOf = (courseId: string, companyId: string | undefined) => {
      const company = companyId ? companies.get(companyId) : undefined;
      const graded = (gradesByCourse.get(courseId) ?? []).filter((g) => g.percent != null);
      return {
        company: company?.name ?? null,
        founders: company ? company.members.length : 1,
        joined: company ? company.members.filter((m) => m.user_id).length : 1,
        avgGrade: graded.length ? Math.round(graded.reduce((a, g) => a + g.percent!, 0) / graded.length) : null,
        graded: graded.length,
      };
    };
    const jobByCourse = new Map(jobs.map((j) => [j.course_id, j]));
    const scores = scoreByCourse(answers);
    const quizScores = new Map(jobs.map((j) => [j.course_id, quizScoreOf(j, indexes)]));
    return Response.json({
      courses: cards.map((c) => {
        const u = users.get(c.userId);
        const job = jobByCourse.get(c.courseId);
        const team = teamOf(c.courseId, job?.company_id ?? u?.company_id);
        return { ...c, team, courseScore: scores.get(scoreKey(c.courseId, c.userId)) ?? null, quizScore: quizScores.get(c.courseId) ?? null, user_email: u?.email ?? null, user_name: u?.full_name ?? null };
      }),
    });
  } catch (error) {
    console.error('Failed to list courses:', error);
    return Response.json({ error: 'Failed to list courses.' }, { status: 500 });
  }
}
