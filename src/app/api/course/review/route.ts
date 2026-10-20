import { z } from 'zod';

import { sessionUserId } from '@/lib/account';
import { QuizError, courseReview } from '@/lib/gap-course/quiz-run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/course/review?courseId= — the questions the signed-in founder got wrong in a
 * course: each module quiz's latest graded attempt (right answers only once that quiz is
 * passed or out of attempts) and the lesson self-checks they missed.
 */
export async function GET(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const courseId = z.string().regex(/^gap_[0-9a-f-]{36}$/).safeParse(new URL(request.url).searchParams.get('courseId'));
  if (!courseId.success) return Response.json({ error: 'Invalid course.' }, { status: 400 });
  try {
    return Response.json(await courseReview(userId, courseId.data));
  } catch (error) {
    if (error instanceof QuizError) return Response.json({ error: error.message }, { status: error.status });
    console.error('Course review failed:', error);
    return Response.json({ error: 'Could not load your review.' }, { status: 500 });
  }
}
