import { lessonContentId, lmsRepos } from '@/brico/lms';
import { enrollmentId, lessonProgressId, progressId } from '@/features/lms/domain';
import { getUser } from '@/lib/account';
import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { isDatabaseConfigured } from '@/lib/db';
import { listCheckpointAnswers, scoreByCourse, scoreKey } from '@/lib/gap-course/checkpoints';
import { getCourseGrade, letterFor } from '@/lib/gap-course/grades';
import { jobCompany } from '@/lib/gap-course/service';
import { loadAttemptIndexes, quizReview, quizScoreOf } from '@/lib/gap-course/quiz-scores';
import { certificateExpiry } from '@/lib/gap-course/shared';
import { getCourseViewForAdmin } from '@/lib/gap-course/view';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/courses/:courseId — one founder's course in full for review: the plan it
 * was built from, every lesson as written (body, key points, callout, checkpoint with its
 * answer and the founder's first pick), generation status, per-lesson completion, the
 * course score, and the founder's enrollment, progress and certificate.
 *
 * A company course has one learner per founder: `?userId=` picks whose answers, attempts
 * and certificate to show (the founder it was built for by default), `team` lists every
 * founder with their grade, and `mostMissed` the quiz questions the team got wrong.
 */
export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  if (!(await currentAdmin())) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });

  const { courseId } = await params;
  try {
    const base = await getCourseViewForAdmin(courseId);
    if (!base) return Response.json({ error: 'Course not found.' }, { status: 404 });
    const company = await jobCompany(base.job);
    const joined = (company?.members ?? []).filter((m) => m.user_id);
    const wanted = new URL(request.url).searchParams.get('userId');
    const selected = wanted && joined.some((m) => m.user_id === wanted) ? wanted : base.job.user_id;
    const view = selected === base.job.user_id ? base : (await getCourseViewForAdmin(courseId, selected))!;
    const { job, course, enrollment, progress, completed, certificate } = view;

    const lessons = (job.modules ?? []).flatMap((m) => m.lessons);
    const quizLessons = lessons.filter((l) => l.kind === 'quiz' && l.assessmentId);
    const repos = lmsRepos();
    const [founder, contents, lessonProgress, allAnswers, indexes, quizzes, grade] = await Promise.all([
      getUser(selected),
      Promise.all(lessons.map((l) => repos.lessonContent.get(lessonContentId(l.id)))),
      Promise.all(lessons.map((l) => repos.lessonProgress.get(lessonProgressId(job.course_id, selected, l.id)))),
      listCheckpointAnswers({ courseId: job.course_id }),
      loadAttemptIndexes(selected),
      Promise.all(lessons.map((l) => (l.kind === 'quiz' && l.assessmentId ? quizReview(l.assessmentId, selected) : null))),
      getCourseGrade(job.course_id, selected),
    ]);
    const answers = allAnswers.filter((a) => a.user_id === selected);

    // The team: every founder on the company, with their own progress, grade and certificate.
    const members = company?.members.length
      ? company.members
      : [{ id: job.user_id, name: founder?.full_name ?? '', email: founder?.email ?? '', phone: null, role: 'lead' as const, user_id: job.user_id, joined_at: null, invited_at: null, invite_hash: null }];
    const team = await Promise.all(
      members.map(async (m) => {
        if (!m.user_id) return { userId: null, name: m.name, email: m.email, phone: m.phone, role: m.role, joined: false, invited: Boolean(m.invite_hash) };
        const [p, e, g, idx] = await Promise.all([
          repos.progress.get(progressId(job.course_id, m.user_id)),
          repos.enrollments.get(enrollmentId(job.course_id, m.user_id)),
          getCourseGrade(job.course_id, m.user_id),
          loadAttemptIndexes(m.user_id),
        ]);
        const live = quizScoreOf({ ...job, user_id: m.user_id }, idx);
        const percent = g?.percent ?? live?.percent ?? null;
        const cert = e?.certificateId ? await repos.certificates.get(e.certificateId) : null;
        return {
          userId: m.user_id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          role: m.role,
          joined: true,
          invited: false,
          progress: p?.percent ?? 0,
          grade: percent != null ? { percent, letter: g?.letter ?? letterFor(percent) } : null,
          quizzesPassed: live?.passed ?? 0,
          quizzes: live?.quizzes ?? quizLessons.length,
          certificateCode: cert?.code ?? null,
          completedAt: e?.completedAt ?? null,
        };
      }),
    );

    // The questions the team got wrong: each founder's latest graded attempt on every quiz.
    const missed = new Map<string, { stem: string; quiz: string; by: string[] }>();
    await Promise.all(
      joined.map(async (m) =>
        Promise.all(
          quizLessons.map(async (l) => {
            const r = await quizReview(l.assessmentId!, m.user_id!);
            const last = r?.attempts.filter((a) => a.status === 'graded').at(-1);
            for (const res of last?.results ?? []) {
              if (res.correct) continue;
              const q = r!.questions.find((x) => x.id === res.questionId);
              const entry = missed.get(res.questionId) ?? { stem: q?.stem ?? '', quiz: l.title, by: [] };
              entry.by.push(m.name);
              missed.set(res.questionId, entry);
            }
          }),
        ),
      ),
    );
    const quizByLesson = new Map(lessons.map((l, i) => [l.id, quizzes[i]]));
    const contentByLesson = new Map(contents.flatMap((c) => (c ? [[c.lessonId, c] as const] : [])));
    const progressByLesson = new Map(lessonProgress.flatMap((p) => (p ? [[p.lessonId, p] as const] : [])));
    const answerByLesson = new Map(answers.map((a) => [a.lesson_id, a]));
    const score = scoreByCourse(answers).get(scoreKey(job.course_id, selected)) ?? { correct: 0, answered: 0, percent: null };

    return Response.json({
      founder: founder ? { id: founder.id, email: founder.email, full_name: founder.full_name } : null,
      companyName: company?.name ?? job.plan.startup.name,
      selectedUserId: selected,
      team,
      mostMissed: [...missed.values()].sort((a, b) => b.by.length - a.by.length).slice(0, 15),
      grade: grade?.percent != null ? { percent: grade.percent, letter: grade.letter } : null,
      course: {
        courseId: job.course_id,
        reportId: job.id,
        userId: job.user_id,
        status: job.status,
        error: job.error ?? null,
        title: job.title ?? null,
        subtitle: job.subtitle ?? null,
        description: job.description ?? null,
        published: course?.status === 'published',
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      },
      plan: job.plan,
      score: { ...score, checkpoints: contents.filter((c) => c?.checkpoint).length },
      quizScore: quizScoreOf({ ...job, user_id: selected }, indexes),
      enrollment: enrollment
        ? {
            status: enrollment.status,
            source: enrollment.source,
            startedAt: enrollment.startedAt,
            lastAccessedAt: enrollment.lastAccessedAt,
            completedAt: enrollment.completedAt ?? null,
            lastLessonId: enrollment.lastLessonId ?? null,
            curriculumVersion: enrollment.curriculumVersion,
          }
        : null,
      progress: progress
        ? {
            percent: progress.percent,
            completed: progress.completedRequired,
            total: progress.requiredTotal,
            timeSpentSec: progress.timeSpentSec,
          }
        : null,
      certificate: certificate
        ? {
            code: certificate.code,
            learnerName: certificate.learnerNameSnap,
            courseTitle: certificate.courseTitleSnap,
            issuedAt: certificate.issuedAt,
            expiresAt: certificateExpiry(certificate.issuedAt).toISOString(),
            revokedAt: certificate.revokedAt ?? null,
          }
        : null,
      modules: (job.modules ?? []).map((m) => ({
        id: m.id,
        key: m.key,
        title: m.title,
        lessons: m.lessons.map((l) => {
          const c = contentByLesson.get(l.id);
          return {
            id: l.id,
            title: l.title,
            brief: l.brief,
            durationMin: l.durationMin,
            status: l.status,
            error: l.error ?? null,
            kind: l.kind ?? 'lesson',
            quiz: quizByLesson.get(l.id) ?? null,
            completed: completed.has(l.id),
            completedAt: progressByLesson.get(l.id)?.completedAt ?? null,
            answer: answerByLesson.has(l.id)
              ? {
                  optionId: answerByLesson.get(l.id)!.option_id,
                  correct: answerByLesson.get(l.id)!.correct,
                  answeredAt: answerByLesson.get(l.id)!.answered_at,
                }
              : null,
            content: c
              ? {
                  body: c.body ?? '',
                  keyPoints: c.keyPoints ?? [],
                  callout: c.callout ?? null,
                  diagram: c.diagram ?? null,
                  checkpoint: c.checkpoint ?? null,
                }
              : null,
          };
        }),
      })),
    });
  } catch (error) {
    console.error('Failed to load course:', error);
    return Response.json({ error: 'Failed to load course.' }, { status: 500 });
  }
}
