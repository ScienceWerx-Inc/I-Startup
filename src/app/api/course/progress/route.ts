import { z } from 'zod';

import { lms } from '@/brico/lms';
import { currentUser } from '@/lib/account';
import { reportIdFor } from '@/lib/gap-course/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Schema = z.object({
  courseId: z.string().regex(/^gap_[0-9a-f-]{36}$/),
  lessonId: z.string().regex(/^les_[0-9a-f-]{1,40}$/),
});

/**
 * POST /api/course/progress — marks a lesson complete. The lms brick checks enrollment
 * and access, counts it once, and issues the 01 Certification on the last lesson.
 */
export async function POST(request: Request) {
  const user = await currentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !reportIdFor(parsed.data.courseId)) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  try {
    const result = await lms().completeLesson({
      courseId: parsed.data.courseId,
      userId: user.id,
      lessonId: parsed.data.lessonId,
      learnerName: user.full_name || user.email,
    });
    if ('error' in result) {
      return Response.json({ error: 'This lesson is not available to you.' }, { status: result.error === 'locked' ? 403 : 404 });
    }
    return Response.json({ percent: result.progress.percent, complete: result.completion.complete });
  } catch (error) {
    console.error('Failed to complete lesson:', error);
    return Response.json({ error: 'Could not save your progress.' }, { status: 500 });
  }
}
