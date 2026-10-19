import { assessmentRepos } from '@/brico/assessment';
import { attemptId, attemptIndexId, questionKeyId, type AttemptIndex } from '@/features/assessment/domain';
import { db } from '@/lib/db';

import type { CourseJob } from './service';

/**
 * Module-quiz results for the admin console: per course, how many quizzes the founder
 * passed and the average of their best attempt on each quiz they tried. Read from the
 * assessment brick's attempt index (one document per founder per quiz).
 */

export interface QuizScore {
  quizzes: number;
  attempted: number;
  passed: number;
  /** Average best percent over attempted quizzes, or null before any attempt. */
  percent: number | null;
}

const quizIdsOf = (job: CourseJob) =>
  (job.modules ?? []).flatMap((m) => m.lessons.flatMap((l) => (l.kind === 'quiz' && l.assessmentId ? [l.assessmentId] : [])));

/** Attempt indexes keyed by `${assessmentId}|${userId}`: one founder's, or everyone's. */
export async function loadAttemptIndexes(userId?: string): Promise<Map<string, AttemptIndex>> {
  // The brick's collection, read directly: a plain equality filter needs no index.
  let query = db().collection('assessment_attemptIndex').limit(20_000);
  if (userId) query = query.where('userId', '==', userId);
  const snap = await query.get();
  return new Map(snap.docs.map((d) => {
    const row = d.data() as AttemptIndex;
    return [`${row.assessmentId}|${row.userId}`, row];
  }));
}

export function quizScoreOf(job: CourseJob, indexes: Map<string, AttemptIndex>): QuizScore | null {
  const ids = quizIdsOf(job);
  if (!ids.length) return null;
  const rows = ids.map((id) => indexes.get(`${id}|${job.user_id}`)).filter((r): r is AttemptIndex => Boolean(r?.attemptCount));
  return {
    quizzes: ids.length,
    attempted: rows.length,
    passed: rows.filter((r) => r.passed).length,
    percent: rows.length ? Math.round(rows.reduce((a, r) => a + r.bestPercent, 0) / rows.length) : null,
  };
}

/** One quiz in full, for review: questions with their keys, and every attempt the founder made. */
export async function quizReview(assessmentId: string, userId: string) {
  const repos = assessmentRepos();
  const quiz = await repos.assessments.get(assessmentId);
  if (!quiz || quiz.selection.mode !== 'fixed') return null;
  const ids = quiz.selection.questionIds;
  const [questions, keys, index] = await Promise.all([
    repos.questions.getMany(ids),
    repos.questionKeys.getMany(ids.map(questionKeyId)),
    repos.attemptIndex.get(attemptIndexId(assessmentId, userId)),
  ]);
  const keyOf = new Map(keys.map((k) => [k.questionId, k.key]));
  const attempts = index?.attemptCount
    ? (
        await repos.attempts.getMany(
          Array.from({ length: Math.min(index.attemptCount, 10) }, (_, i) => attemptId(assessmentId, userId, i + 1)),
        )
      ).sort((a, b) => a.attemptNo - b.attemptNo)
    : [];
  const byId = new Map(questions.map((q) => [q.id, q]));
  return {
    title: quiz.title,
    passPercent: quiz.policy.passPercent,
    maxAttempts: quiz.policy.maxAttempts,
    bestPercent: index?.bestPercent ?? null,
    passed: index?.passed ?? false,
    questions: ids.flatMap((id) => {
      const q = byId.get(id);
      if (!q) return [];
      const key = keyOf.get(id);
      const options =
        q.payload.kind === 'true_false'
          ? [
              { id: 'true', label: 'True' },
              { id: 'false', label: 'False' },
            ]
          : q.payload.kind === 'mcq_single' || q.payload.kind === 'mcq_multi'
            ? q.payload.options
            : [];
      const correct =
        key?.kind === 'mcq_single'
          ? [key.correctOptionId]
          : key?.kind === 'mcq_multi'
            ? key.correctOptionIds
            : key?.kind === 'true_false'
              ? [String(key.correct)]
              : [];
      return [{ id, type: q.type, stem: q.stem, options, correctOptionIds: correct, explanation: q.explanation ?? null }];
    }),
    attempts: attempts.map((a) => ({
      attemptNo: a.attemptNo,
      status: a.status,
      percent: a.percent,
      passed: a.passed,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt ?? null,
      results: a.graded.map((g) => {
        const r = a.responses[g.questionId];
        const picked = !r ? [] : r.kind === 'mcq_single' ? [r.optionId] : r.kind === 'mcq_multi' ? r.optionIds : r.kind === 'true_false' ? [String(r.value)] : [];
        return { questionId: g.questionId, correct: g.correct, picked };
      }),
    })),
  };
}

export type QuizReview = NonNullable<Awaited<ReturnType<typeof quizReview>>>;
