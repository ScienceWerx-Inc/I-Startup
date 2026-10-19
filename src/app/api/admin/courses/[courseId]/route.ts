import { lessonContentId, lmsRepos } from '@/brico/lms';
import { getUser } from '@/lib/account';
import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { isDatabaseConfigured } from '@/lib/db';
import { certificateExpiry } from '@/lib/gap-course/shared';
import { getCourseViewForAdmin } from '@/lib/gap-course/view';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/courses/:courseId — one founder's course in full for review: the plan it
 * was built from, every lesson as written (body, key points, callout, checkpoint with its
 * answer), generation status, and the founder's enrollment, progress and certificate.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  if (!(await currentAdmin())) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });

  const { courseId } = await params;
  try {
    const view = await getCourseViewForAdmin(courseId);
    if (!view) return Response.json({ error: 'Course not found.' }, { status: 404 });
    const { job, course, enrollment, progress, completed, certificate } = view;

    const lessons = (job.modules ?? []).flatMap((m) => m.lessons);
    const repo = lmsRepos().lessonContent;
    const [founder, contents] = await Promise.all([
      getUser(job.user_id),
      Promise.all(lessons.map((l) => repo.get(lessonContentId(l.id)))),
    ]);
    const contentByLesson = new Map(contents.flatMap((c) => (c ? [[c.lessonId, c] as const] : [])));

    return Response.json({
      founder: founder ? { id: founder.id, email: founder.email, full_name: founder.full_name } : null,
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
      enrollment: enrollment
        ? {
            status: enrollment.status,
            source: enrollment.source,
            startedAt: enrollment.startedAt,
            lastAccessedAt: enrollment.lastAccessedAt,
            completedAt: enrollment.completedAt ?? null,
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
            completed: completed.has(l.id),
            content: c
              ? { body: c.body ?? '', keyPoints: c.keyPoints ?? [], callout: c.callout ?? null, checkpoint: c.checkpoint ?? null }
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
