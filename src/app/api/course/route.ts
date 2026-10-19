import { z } from 'zod';

import { sessionUserId } from '@/lib/account';
import { CourseError, finishCourse, getJob, startCourse, writeLesson, type CourseJob } from '@/lib/gap-course/service';
import type { PublicCourseJob } from '@/lib/gap-course/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// One model call per request at most (an outline, a lesson or a quiz).
export const maxDuration = 120;

/** What the client sees of a job: no plan internals, no other founder's data. */
function publicJob(job: CourseJob): PublicCourseJob {
  return {
    reportId: job.id,
    courseId: job.course_id,
    status: job.status,
    title: job.title ?? null,
    subtitle: job.subtitle ?? null,
    error: job.error ?? null,
    plan: job.plan.modules.map((m) => ({ key: m.key, title: m.title, percent: m.percent, gaps: m.focus.map((f) => f.title) })),
    modules: (job.modules ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, status: l.status, kind: l.kind ?? 'lesson' })),
    })),
  };
}

const ReportId = z.string().uuid();

/** GET /api/course?reportId= — the generation job for one of the founder's reports. */
export async function GET(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const reportId = ReportId.safeParse(new URL(request.url).searchParams.get('reportId'));
  if (!reportId.success) return Response.json({ error: 'Invalid report.' }, { status: 400 });
  const job = await getJob(userId, reportId.data);
  return Response.json({ job: job ? publicJob(job) : null });
}

const PostSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('start'), reportId: ReportId }),
  // A lesson, or a module's quiz (written through the same step once its lessons are done).
  z.object({ op: z.literal('lesson'), reportId: ReportId, lessonId: z.string().regex(/^(les|quiz)_[0-9a-f-]{1,40}$/) }),
  z.object({ op: z.literal('finish'), reportId: ReportId }),
]);

/** POST /api/course — one step of building a founder's gap-closing course. */
export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  try {
    const input = parsed.data;
    const job =
      input.op === 'start'
        ? await startCourse(userId, input.reportId)
        : input.op === 'lesson'
          ? await writeLesson(userId, input.reportId, input.lessonId)
          : await finishCourse(userId, input.reportId);
    return Response.json({ job: publicJob(job) });
  } catch (error) {
    if (error instanceof CourseError) return Response.json({ error: error.message }, { status: error.status });
    console.error('Course step failed:', error);
    return Response.json({ error: 'Something went wrong building your course.' }, { status: 500 });
  }
}
