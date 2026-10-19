import { z } from 'zod';

import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { col, isDatabaseConfigured } from '@/lib/db';
import { publicJob } from '@/lib/gap-course/public-job';
import { CourseError, finishCourse, getJob, startCourse, writeLesson } from '@/lib/gap-course/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// One model call per request at most (an outline, a lesson or a quiz).
export const maxDuration = 120;

/**
 * /api/admin/courses/build — an admin generating a founder's gap-closing course from the
 * console. The same steps as the founder's own builder (/api/course), run on behalf of the
 * report's owner: the course is theirs, granted regardless of the paywall.
 */

const ReportId = z.string().uuid();

async function ownerOf(reportId: string): Promise<string> {
  const snap = await col('reports').doc(reportId).get();
  const owner = snap.exists ? (snap.get('user_id') as string | null) : null;
  if (!owner) throw new CourseError('That report has no founder account to give a course to.', 404);
  return owner;
}

const fail = (error: unknown) => {
  if (error instanceof CourseError) return Response.json({ error: error.message }, { status: error.status });
  console.error('Admin course build failed:', error);
  return Response.json({ error: 'Something went wrong building the course.' }, { status: 500 });
};

/** GET ?reportId= — the build job for that report, if any. */
export async function GET(request: Request) {
  if (!(await currentAdmin())) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });
  const reportId = ReportId.safeParse(new URL(request.url).searchParams.get('reportId'));
  if (!reportId.success) return Response.json({ error: 'Invalid report.' }, { status: 400 });
  try {
    const job = await getJob(await ownerOf(reportId.data), reportId.data);
    return Response.json({ job: job ? publicJob(job) : null });
  } catch (error) {
    return fail(error);
  }
}

const PostSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('start'), reportId: ReportId }),
  z.object({ op: z.literal('lesson'), reportId: ReportId, lessonId: z.string().regex(/^(les|quiz)_[0-9a-f-]{1,40}$/) }),
  z.object({ op: z.literal('finish'), reportId: ReportId }),
]);

/** POST — one build step: start (outline), lesson (a lesson or a module quiz), finish (publish + enroll). */
export async function POST(request: Request) {
  const admin = await currentAdmin();
  if (!admin) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });
  const parsed = PostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  try {
    const input = parsed.data;
    const owner = await ownerOf(input.reportId);
    const job =
      input.op === 'start'
        ? await startCourse(owner, input.reportId, { createdBy: admin })
        : input.op === 'lesson'
          ? await writeLesson(owner, input.reportId, input.lessonId)
          : await finishCourse(owner, input.reportId);
    return Response.json({ job: publicJob(job) });
  } catch (error) {
    return fail(error);
  }
}
