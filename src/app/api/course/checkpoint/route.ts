import { z } from 'zod';

import { sessionUserId } from '@/lib/account';
import { recordCheckpointAnswer } from '@/lib/gap-course/checkpoints';
import { CourseError } from '@/lib/gap-course/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Schema = z.object({
  courseId: z.string().regex(/^gap_[0-9a-f-]{36}$/),
  lessonId: z.string().regex(/^les_[0-9a-f-]{1,40}$/),
  optionId: z.string().min(1).max(40),
});

/** POST /api/course/checkpoint — keeps the founder's first answer to a lesson's checkpoint. */
export async function POST(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  try {
    const { courseId, lessonId, optionId } = parsed.data;
    return Response.json(await recordCheckpointAnswer(userId, courseId, lessonId, optionId));
  } catch (error) {
    if (error instanceof CourseError) return Response.json({ error: error.message }, { status: error.status });
    console.error('Failed to record checkpoint answer:', error);
    return Response.json({ error: 'Could not save your answer.' }, { status: 500 });
  }
}
