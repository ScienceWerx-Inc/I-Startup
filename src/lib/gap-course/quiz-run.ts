import { assessment, assessmentRepos } from '@/brico/assessment';
import { lms } from '@/brico/lms';
import { lessonContentId, lmsRepos } from '@/brico/lms';
import { attemptId as attemptIdFor, attemptIndexId, questionKeyId, type AnswerKey, type Attempt, type Question, type Response } from '@/features/assessment/domain';
import type { ClientQuestion } from '@/features/assessment/server';

import { listCheckpointAnswers } from './checkpoints';
import { upsertCourseGrade } from './grades';
import { getCourseView } from './view';

/**
 * Taking a module quiz, for /api/course/quiz. The assessment brick decides everything that
 * matters — which questions are served and in what order, how many attempts remain, how
 * answers are graded — and its answer keys live in a collection this file never returns.
 * This checks the quiz belongs to the founder's own course, and ticks the quiz in the LMS
 * when they pass (which can finish the course and issue the 411 Certificate).
 */

export class QuizError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409,
  ) {
    super(message);
  }
}

export interface QuizFeedback {
  questionId: string;
  stem: string;
  correct: boolean;
  /** Labels of what they picked, so the review reads without the question in front of them. */
  answered: string[];
  /** The right answer's labels — only once the quiz is passed or out of attempts. */
  correctAnswer?: string[];
  explanation?: string;
}

export interface QuizState {
  title: string;
  passPercent: number;
  maxAttempts: number;
  questionCount: number;
  attemptsUsed: number;
  bestPercent: number;
  passed: boolean;
  /** An attempt started and not yet submitted: resumed rather than restarted. */
  inProgress: { attemptId: string; questions: ClientQuestion[] } | null;
  last: { percent: number; passed: boolean; feedback: QuizFeedback[] } | null;
}

async function quizFor(userId: string, courseId: string, lessonId: string) {
  const view = await getCourseView(userId, courseId);
  const lesson = view?.curriculum?.sections.flatMap((s) => s.lessons).find((l) => l.id === lessonId);
  if (!view || !lesson?.assessmentId) throw new QuizError('Quiz not found.', 404);
  const access = await lms().canAccessLesson({ courseId, userId, lessonId });
  if (!access.allowed) throw new QuizError('This quiz is not open to you yet.', 403);
  const quiz = await assessmentRepos().assessments.get(lesson.assessmentId);
  if (!quiz) throw new QuizError('Quiz not found.', 404);
  return { view, quiz };
}

/** An attempt's questions as served (its frozen order), without their keys. */
async function servedQuestions(attempt: Attempt): Promise<ClientQuestion[]> {
  const rows = await assessmentRepos().questions.getMany(attempt.servedItems.map((i) => i.questionId));
  const byId = new Map(rows.map((q) => [q.id, q]));
  return attempt.servedItems.flatMap((item) => {
    const q = byId.get(item.questionId);
    if (!q) return [];
    let payload = q.payload;
    if (item.optionOrder && (payload.kind === 'mcq_single' || payload.kind === 'mcq_multi')) {
      const options = new Map(payload.options.map((o) => [o.id, o]));
      payload = { ...payload, options: item.optionOrder.flatMap((id) => (options.has(id) ? [options.get(id)!] : [])) };
    }
    return [{ questionId: q.id, type: q.type, stem: q.stem, points: q.points, payload }];
  });
}

function labelsOf(question: Question | undefined, response: Response | undefined): string[] {
  if (!question || !response) return [];
  if (response.kind === 'true_false') return [response.value ? 'True' : 'False'];
  const options = question.payload.kind === 'mcq_single' || question.payload.kind === 'mcq_multi' ? question.payload.options : [];
  const ids = response.kind === 'mcq_single' ? [response.optionId] : response.kind === 'mcq_multi' ? response.optionIds : [];
  return ids.map((id) => options.find((o) => o.id === id)?.label ?? id);
}

function keyLabels(question: Question | undefined, key: AnswerKey | undefined): string[] {
  if (!question || !key) return [];
  if (key.kind === 'true_false') return [key.correct ? 'True' : 'False'];
  const options = question.payload.kind === 'mcq_single' || question.payload.kind === 'mcq_multi' ? question.payload.options : [];
  const ids = key.kind === 'mcq_single' ? [key.correctOptionId] : key.kind === 'mcq_multi' ? key.correctOptionIds : [];
  return ids.map((id) => options.find((o) => o.id === id)?.label ?? id);
}

/**
 * Per-question results of a graded attempt. `reveal` adds the right answers: the server
 * sets it only once the quiz is passed or out of attempts, so a retry is never a lookup.
 */
async function feedbackFor(attempt: Attempt, reveal = false): Promise<QuizFeedback[]> {
  const ids = attempt.graded.map((g) => g.questionId);
  const [questions, keys] = await Promise.all([
    assessmentRepos().questions.getMany(ids),
    reveal ? assessmentRepos().questionKeys.getMany(ids.map(questionKeyId)) : Promise.resolve([]),
  ]);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const keyOf = new Map(keys.map((k) => [k.questionId, k.key]));
  return attempt.graded.map((g) => ({
    questionId: g.questionId,
    stem: byId.get(g.questionId)?.stem ?? '',
    correct: g.correct,
    answered: labelsOf(byId.get(g.questionId), attempt.responses[g.questionId]),
    ...(reveal ? { correctAnswer: keyLabels(byId.get(g.questionId), keyOf.get(g.questionId)) } : {}),
    ...(g.explanation ? { explanation: g.explanation } : {}),
  }));
}

/** Whether a quiz's answers may be shown: passed, or every attempt used. */
const mayReveal = (index: { passed: boolean; attemptCount: number } | null, maxAttempts: number) =>
  Boolean(index && (index.passed || (maxAttempts > 0 && index.attemptCount >= maxAttempts)));

export async function quizState(userId: string, courseId: string, lessonId: string): Promise<QuizState> {
  const { quiz } = await quizFor(userId, courseId, lessonId);
  const repos = assessmentRepos();
  const index = await repos.attemptIndex.get(attemptIndexId(quiz.id, userId));
  const last = index?.lastAttemptId ? await repos.attempts.get(index.lastAttemptId) : null;
  const questionCount = quiz.selection.mode === 'fixed' ? quiz.selection.questionIds.length : quiz.selection.count;
  return {
    title: quiz.title,
    passPercent: quiz.policy.passPercent,
    maxAttempts: quiz.policy.maxAttempts,
    questionCount,
    attemptsUsed: index?.attemptCount ?? 0,
    bestPercent: index?.bestPercent ?? 0,
    passed: index?.passed ?? false,
    inProgress: last?.status === 'in_progress' ? { attemptId: last.id, questions: await servedQuestions(last) } : null,
    last:
      last && last.status === 'graded'
        ? { percent: last.percent, passed: last.passed, feedback: await feedbackFor(last, mayReveal(index, quiz.policy.maxAttempts)) }
        : null,
  };
}

export async function startQuiz(userId: string, courseId: string, lessonId: string) {
  const { quiz } = await quizFor(userId, courseId, lessonId);
  const result = await assessment().startAttempt({ assessmentId: quiz.id, userId });
  if (!result.ok) {
    throw new QuizError(result.code === 'no_attempts_left' ? 'You have used every attempt at this quiz.' : result.message, 409);
  }
  return { attemptId: result.attempt.id, questions: result.questions };
}

export async function submitQuiz(input: {
  userId: string;
  learnerName: string;
  courseId: string;
  lessonId: string;
  attemptId: string;
  responses: Record<string, Response>;
}) {
  const { quiz, view } = await quizFor(input.userId, input.courseId, input.lessonId);
  const attempt = await assessmentRepos().attempts.get(input.attemptId);
  if (!attempt || attempt.userId !== input.userId || attempt.assessmentId !== quiz.id) {
    throw new QuizError('That attempt is not yours.', 403);
  }
  // Only answers to questions this attempt actually served are graded.
  const served = new Set(attempt.servedItems.map((i) => i.questionId));
  const responses = Object.fromEntries(Object.entries(input.responses).filter(([id]) => served.has(id)));

  const result = await assessment().submitAttempt({ attemptId: input.attemptId, responses });
  if (!result.ok) throw new QuizError(result.message, 409);

  let courseComplete = false;
  if (result.attempt.passed) {
    const recorded = await lms().recordAssessmentsPassed({
      courseId: input.courseId,
      userId: input.userId,
      assessmentIds: [quiz.id],
      learnerName: input.learnerName,
    });
    courseComplete = 'completion' in recorded && recorded.completion.complete;
  }
  // The founder's course grade moves with every attempt, and freezes when the course completes.
  const grade = await upsertCourseGrade(view.job, input.userId, input.learnerName);
  const index = await assessmentRepos().attemptIndex.get(attemptIndexId(quiz.id, input.userId));
  return {
    percent: result.attempt.percent,
    passed: result.attempt.passed,
    courseComplete,
    grade: { percent: grade.percent, letter: grade.letter },
    feedback: await feedbackFor(result.attempt, mayReveal(index, quiz.policy.maxAttempts)),
  };
}

/* ───────────────────────────── questions to review ───────────────────────────── */

export interface ReviewItem {
  lessonId: string;
  lessonTitle: string;
  stem: string;
  answered: string[];
  correctAnswer?: string[];
  explanation?: string;
}

export interface CourseReview {
  quizzes: Array<{
    lessonId: string;
    title: string;
    percent: number;
    passed: boolean;
    revealed: boolean;
    missed: ReviewItem[];
  }>;
  /** Lesson self-checks they got wrong on their first pick (those answers were never secret). */
  checkpoints: ReviewItem[];
}

/** Everything the founder got wrong in a course: each quiz's latest graded attempt, and self-checks. */
export async function courseReview(userId: string, courseId: string): Promise<CourseReview> {
  const view = await getCourseView(userId, courseId);
  if (!view?.curriculum) throw new QuizError('Course not found.', 404);
  const lessons = view.curriculum.sections.flatMap((s) => s.lessons);
  const repos = assessmentRepos();

  const quizzes = await Promise.all(
    lessons
      .filter((l) => l.assessmentId)
      .map(async (l) => {
        const [quiz, index] = await Promise.all([
          repos.assessments.get(l.assessmentId!),
          repos.attemptIndex.get(attemptIndexId(l.assessmentId!, userId)),
        ]);
        if (!quiz || !index?.attemptCount) return null;
        // The latest attempt that was graded (the newest may still be open).
        const attempts = await repos.attempts.getMany(
          Array.from({ length: Math.min(index.attemptCount, 10) }, (_, i) => attemptIdFor(quiz.id, userId, i + 1)),
        );
        const last = attempts.filter((a) => a.status === 'graded').sort((a, b) => b.attemptNo - a.attemptNo)[0];
        if (!last) return null;
        const revealed = mayReveal(index, quiz.policy.maxAttempts);
        const missed = (await feedbackFor(last, revealed))
          .filter((f) => !f.correct)
          .map(({ questionId: _q, correct: _c, ...f }) => ({ lessonId: l.id, lessonTitle: l.title, ...f }));
        return { lessonId: l.id, title: l.title, percent: last.percent, passed: index.passed, revealed, missed };
      }),
  );

  const wrong = (await listCheckpointAnswers({ courseId })).filter((a) => a.user_id === userId && !a.correct);
  const contents = await Promise.all(wrong.map((a) => lmsRepos().lessonContent.get(lessonContentId(a.lesson_id))));
  const checkpoints = wrong.flatMap((a, i): ReviewItem[] => {
    const cp = contents[i]?.checkpoint;
    if (!cp) return [];
    const label = (id: string) => cp.options.find((o) => o.id === id)?.label ?? id;
    return [
      {
        lessonId: a.lesson_id,
        lessonTitle: lessons.find((l) => l.id === a.lesson_id)?.title ?? '',
        stem: cp.stem,
        answered: [label(a.option_id)],
        correctAnswer: cp.correctOptionIds.map(label),
        explanation: cp.explanation,
      },
    ];
  });

  return { quizzes: quizzes.filter((q): q is NonNullable<typeof q> => q !== null), checkpoints };
}
