import { z } from 'zod';

import { currentUser } from '@/lib/account';
import { QuizError, quizState, startQuiz, submitQuiz } from '@/lib/gap-course/quiz-run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CourseId = z.string().regex(/^gap_[0-9a-f-]{36}$/);
const QuizLessonId = z.string().regex(/^quiz_[0-9a-f-]{1,40}$/);

const ResponseSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('mcq_single'), optionId: z.string().max(40) }),
  z.object({ kind: z.literal('mcq_multi'), optionIds: z.array(z.string().max(40)).max(10) }),
  z.object({ kind: z.literal('true_false'), value: z.boolean() }),
]);

const PostSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('start'), courseId: CourseId, lessonId: QuizLessonId }),
  z.object({
    op: z.literal('submit'),
    courseId: CourseId,
    lessonId: QuizLessonId,
    attemptId: z.string().min(1).max(200),
    responses: z.record(z.string().max(120), ResponseSchema),
  }),
]);

const fail = (error: unknown) => {
  if (error instanceof QuizError) return Response.json({ error: error.message }, { status: error.status });
  console.error('Quiz request failed:', error);
  return Response.json({ error: 'Something went wrong with this quiz.' }, { status: 500 });
};

/** GET /api/course/quiz?courseId=&lessonId= — the quiz, the founder's attempts, and the last result. */
export async function GET(request: Request) {
  const user = await currentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const url = new URL(request.url);
  const courseId = CourseId.safeParse(url.searchParams.get('courseId'));
  const lessonId = QuizLessonId.safeParse(url.searchParams.get('lessonId'));
  if (!courseId.success || !lessonId.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });
  try {
    return Response.json(await quizState(user.id, courseId.data, lessonId.data));
  } catch (error) {
    return fail(error);
  }
}

/** POST /api/course/quiz — start an attempt, or submit one for grading. */
export async function POST(request: Request) {
  const user = await currentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const parsed = PostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });
  try {
    const input = parsed.data;
    if (input.op === 'start') return Response.json(await startQuiz(user.id, input.courseId, input.lessonId));
    return Response.json(
      await submitQuiz({ ...input, userId: user.id, learnerName: user.full_name || user.email }),
    );
  } catch (error) {
    return fail(error);
  }
}
