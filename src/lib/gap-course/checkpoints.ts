import { lessonContentId, lmsRepos } from '@/brico/lms';
import { col, isAlreadyExists, nowIso, rows } from '@/lib/db';

import { CourseError, getJob, reportIdFor } from './service';

/**
 * The course score: each founder's FIRST answer to every lesson's checkpoint. The
 * checkpoint stays a self-check for the founder (the answer is revealed as they pick),
 * but the first pick is kept so admins can see how well the course landed. Retries never
 * overwrite it.
 */

export interface CheckpointAnswerRow {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  option_id: string;
  correct: boolean;
  answered_at: string;
}

/** Per founder: co-founders on one course each keep their own first answer. */
const answerId = (courseId: string, lessonId: string, userId: string) => `${courseId}_${lessonId}_${userId}`;
/** The id used before courses had several learners (only ever the course's own founder). */
const legacyAnswerId = (courseId: string, lessonId: string) => `${courseId}_${lessonId}`;

export async function recordCheckpointAnswer(
  userId: string,
  courseId: string,
  lessonId: string,
  optionId: string,
): Promise<{ correct: boolean; recorded: boolean }> {
  const reportId = reportIdFor(courseId);
  const job = reportId ? await getJob(userId, reportId) : null;
  if (!job?.modules?.some((m) => m.lessons.some((l) => l.id === lessonId))) throw new CourseError('Lesson not found.', 404);

  const content = await lmsRepos().lessonContent.get(lessonContentId(lessonId));
  const checkpoint = content?.checkpoint;
  if (!checkpoint?.options.some((o) => o.id === optionId)) throw new CourseError('Invalid answer.', 400);

  const correct = checkpoint.correctOptionIds.includes(optionId);
  const row: Omit<CheckpointAnswerRow, 'id'> = {
    user_id: userId,
    course_id: courseId,
    lesson_id: lessonId,
    option_id: optionId,
    correct,
    answered_at: nowIso(),
  };
  const legacy = await col('checkpointAnswers').doc(legacyAnswerId(courseId, lessonId)).get();
  if (legacy.exists && legacy.get('user_id') === userId) return { correct, recorded: false };
  try {
    await col('checkpointAnswers').doc(answerId(courseId, lessonId, userId)).create(row);
    return { correct, recorded: true };
  } catch (error) {
    if (isAlreadyExists(error)) return { correct, recorded: false };
    throw error;
  }
}

/** Recorded answers for one course, one founder, or (no filter) everyone, up to `limit`. */
export function listCheckpointAnswers(filter: { courseId?: string; userId?: string } = {}, limit = 20_000) {
  let query = col('checkpointAnswers').limit(limit);
  if (filter.courseId) query = query.where('course_id', '==', filter.courseId);
  else if (filter.userId) query = query.where('user_id', '==', filter.userId);
  return rows<CheckpointAnswerRow>(query);
}

export interface CourseScore {
  correct: number;
  answered: number;
  /** Rounded percent of answered checkpoints got right first time, or null before any answer. */
  percent: number | null;
}

/** The key of one founder's self-check score on one course. */
export const scoreKey = (courseId: string, userId: string) => `${courseId}|${userId}`;

/** Self-check scores keyed by `scoreKey(course, founder)`: co-founders are scored apart. */
export function scoreByCourse(answers: CheckpointAnswerRow[]): Map<string, CourseScore> {
  const out = new Map<string, CourseScore>();
  for (const a of answers) {
    const key = scoreKey(a.course_id, a.user_id);
    const s = out.get(key) ?? { correct: 0, answered: 0, percent: null };
    s.answered += 1;
    if (a.correct) s.correct += 1;
    s.percent = Math.round((s.correct / s.answered) * 100);
    out.set(key, s);
  }
  return out;
}
