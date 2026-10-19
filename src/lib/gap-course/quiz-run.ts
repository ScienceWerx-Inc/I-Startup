import { assessment, assessmentRepos } from '@/brico/assessment';
import { lms } from '@/brico/lms';
import { attemptIndexId, type Attempt, type Question, type Response } from '@/features/assessment/domain';
import type { ClientQuestion } from '@/features/assessment/server';

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

async function feedbackFor(attempt: Attempt): Promise<QuizFeedback[]> {
  const questions = await assessmentRepos().questions.getMany(attempt.graded.map((g) => g.questionId));
  const byId = new Map(questions.map((q) => [q.id, q]));
  return attempt.graded.map((g) => ({
    questionId: g.questionId,
    stem: byId.get(g.questionId)?.stem ?? '',
    correct: g.correct,
    answered: labelsOf(byId.get(g.questionId), attempt.responses[g.questionId]),
    ...(g.explanation ? { explanation: g.explanation } : {}),
  }));
}

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
    last: last && last.status === 'graded' ? { percent: last.percent, passed: last.passed, feedback: await feedbackFor(last) } : null,
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
  const { quiz } = await quizFor(input.userId, input.courseId, input.lessonId);
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
  return {
    percent: result.attempt.percent,
    passed: result.attempt.passed,
    courseComplete,
    feedback: await feedbackFor(result.attempt),
  };
}
