import { randomUUID } from 'node:crypto';

import { assessmentRepos } from '@/brico/assessment';
import { lessonContentId, lms, lmsRepos } from '@/brico/lms';
import { questionKeyId, type AnswerKey, type Assessment, type Question, type QuestionPayload } from '@/features/assessment/domain';
import type { Course, CurriculumSection, LessonContent } from '@/features/lms/domain';
import { col, db, isAlreadyExists, nowIso } from '@/lib/db';
import { courseAccess, entitlements } from '@/lib/payments';
import type { StartupProfile } from '@/modules/istartup-score/assessment/bank';
import type { Answers } from '@/modules/istartup-score/assessment/scoring';

import { generateLesson, generateModuleQuiz, generateOutline, type QuizQuestion } from './ai';
import { planFromAnswers, type GapPlan } from './plan';
import { EXERCISE_PREFIX, type JobStatus, type LessonStatus } from './shared';

/**
 * A founder's gap-closing course, from finished interview to published LMS course.
 *
 *   start   → plan the gaps (pure) and generate the outline     (one model call)
 *   lesson  → write one lesson into the brick's lessonContent    (one model call each)
 *   finish  → create the Course, publishCurriculum, publishCourse, enroll the founder
 *
 * Each module ends with a graded quiz, written as one more step once that module's
 * lessons are done (it draws only on them), and stored in the assessment brick.
 *
 * The client drives the steps (a few lessons at a time), so no request runs long and a
 * closed tab simply resumes where it stopped. Every step is idempotent, and progress
 * lives in `istartup_course_jobs/{reportId}`, owned by the founder who took the test.
 */


export interface JobLesson {
  id: string;
  title: string;
  brief: string;
  focusQuestionIds: string[];
  durationMin: number;
  status: LessonStatus;
  startedAt?: string;
  error?: string;
  /** 'quiz' for the module's closing graded quiz; absent means a written lesson. */
  kind?: 'lesson' | 'quiz';
  /** A quiz's assessment, once written. */
  assessmentId?: string;
}

/** A module quiz measures: limited attempts, feedback after submitting, 70% to pass. */
export const QUIZ_POLICY = {
  maxAttempts: 3,
  scoring: 'best' as const,
  shuffleQuestions: true,
  feedback: 'after_attempt' as const,
  passPercent: 70,
};

export const isQuiz = (l: Pick<JobLesson, 'kind'>) => l.kind === 'quiz';

export interface JobModule {
  id: string;
  key: string;
  title: string;
  lessons: JobLesson[];
}

export interface CourseJob {
  id: string;
  user_id: string;
  course_id: string;
  status: JobStatus;
  plan: GapPlan;
  title?: string;
  subtitle?: string;
  description?: string;
  modules?: JobModule[];
  error?: string;
  /** The admin who generated this course for the founder from the console, if one did. */
  created_by?: string;
  /** When the current outline/publish attempt began, to recover from a crashed request. */
  step_started_at?: string;
  created_at: string;
  updated_at: string;
}

export class CourseError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 402 | 404 | 409 | 500,
  ) {
    super(message);
  }
}

/** A step that has been "in progress" this long is assumed dead and may be retried. */
const STALE_MS = 150_000;
const isStale = (iso?: string) => !iso || Date.now() - Date.parse(iso) > STALE_MS;

export const courseIdFor = (reportId: string) => `gap_${reportId}`;
export const reportIdFor = (courseId: string) => (courseId.startsWith('gap_') ? courseId.slice(4) : null);

const jobRef = (reportId: string) => col('courseJobs').doc(reportId);

export async function getJob(userId: string, reportId: string): Promise<CourseJob | null> {
  const job = await getJobById(reportId);
  return job?.user_id === userId ? job : null;
}

/** A job whoever owns it. Admin-only: founder-facing callers go through `getJob`. */
export async function getJobById(reportId: string): Promise<CourseJob | null> {
  const snap = await jobRef(reportId).get();
  return snap.exists ? (snap.data() as CourseJob) : null;
}

/** Every founder's jobs, newest first. Admin-only. */
export async function listAllJobs(limit = 1000): Promise<CourseJob[]> {
  const snap = await col('courseJobs').orderBy('created_at', 'desc').limit(limit).get();
  return snap.docs.map((d) => d.data() as CourseJob);
}

export async function listJobs(userId: string): Promise<CourseJob[]> {
  const snap = await col('courseJobs').where('user_id', '==', userId).get();
  return snap.docs
    .map((d) => d.data() as CourseJob)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

/* ─────────────────────────────────── start ─────────────────────────────────── */

/**
 * Starts (or resumes) the course for one of `userId`'s reports. `createdBy` is set when an
 * admin generates it from the console: the founder is granted the course regardless of the
 * paywall, and enrolled as 'admin'.
 */
export async function startCourse(userId: string, reportId: string, opts: { createdBy?: string } = {}): Promise<CourseJob> {
  if (!opts.createdBy && !(await courseAccess(userId))) throw new CourseError('Enroll in the course to unlock it.', 402);

  const report = await col('reports').doc(reportId).get();
  if (!report.exists || report.get('user_id') !== userId) throw new CourseError('Report not found.', 404);

  const ref = jobRef(reportId);
  const now = nowIso();
  let job: CourseJob;
  try {
    job = {
      id: reportId,
      user_id: userId,
      course_id: courseIdFor(reportId),
      status: 'outlining',
      plan: planFromAnswers(report.get('profile') as StartupProfile, report.get('answers') as Answers),
      step_started_at: now,
      ...(opts.createdBy ? { created_by: opts.createdBy } : {}),
      created_at: now,
      updated_at: now,
    };
    await ref.create(job);
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    // Exists: hand it back, unless its outline failed or a crashed request left it hanging.
    const claimed = await db().runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data() as CourseJob;
      const retry =
        !current.modules &&
        (current.status === 'error' || (current.status === 'outlining' && isStale(current.step_started_at)));
      if (!retry) return { job: current, claimed: false };
      const next = { ...current, status: 'outlining' as const, error: undefined, step_started_at: nowIso(), updated_at: nowIso() };
      tx.set(ref, next);
      return { job: next, claimed: true };
    });
    if (!claimed.claimed) return claimed.job;
    job = claimed.job;
  }

  try {
    const outline = await generateOutline(job.plan);
    const modules: JobModule[] = outline.modules.map((m) => ({
      id: `sec_${randomUUID().slice(0, 8)}`,
      key: m.key,
      title: m.title,
      lessons: [
        ...m.lessons.map((l) => ({
          id: `les_${randomUUID().slice(0, 10)}`,
          title: l.title,
          brief: l.brief,
          focusQuestionIds: l.focusQuestionIds,
          durationMin: l.durationMin,
          status: 'pending' as const,
        })),
        {
          id: `quiz_${randomUUID().slice(0, 10)}`,
          title: `Quiz: ${m.title}`,
          brief: 'The graded quiz on this module.',
          focusQuestionIds: [],
          durationMin: 6,
          status: 'pending' as const,
          kind: 'quiz' as const,
        },
      ],
    }));
    const patch = {
      status: 'writing' as const,
      title: outline.title,
      subtitle: outline.subtitle,
      description: outline.description,
      modules,
      updated_at: nowIso(),
    };
    await ref.update(patch);
    return { ...job, ...patch };
  } catch (error) {
    console.error('Course outline failed:', error);
    await ref.update({ status: 'error', error: 'We could not design your course. Try again.', updated_at: nowIso() });
    throw new CourseError('We could not design your course. Try again.', 500);
  }
}

/* ────────────────────────────────── lessons ────────────────────────────────── */

function patchLesson(job: CourseJob, lessonId: string, patch: Partial<JobLesson>): JobModule[] {
  return (job.modules ?? []).map((m) => ({
    ...m,
    lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)),
  }));
}

export async function writeLesson(userId: string, reportId: string, lessonId: string): Promise<CourseJob> {
  const ref = jobRef(reportId);

  // Claim the lesson, so two tabs don't write it twice.
  const claim = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = snap.data() as CourseJob | undefined;
    if (!job || job.user_id !== userId || !job.modules) throw new CourseError('Course not found.', 404);
    const owner = job.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
    const lesson = owner?.lessons.find((l) => l.id === lessonId);
    if (!owner || !lesson) throw new CourseError('Lesson not found.', 404);
    if (lesson.status === 'done') return { job, run: false };
    // A quiz is written from its module's lessons, so it waits for them.
    if (isQuiz(lesson) && owner.lessons.some((l) => !isQuiz(l) && l.status !== 'done')) {
      throw new CourseError('The quiz waits for its lessons.', 409);
    }
    if (lesson.status === 'running' && !isStale(lesson.startedAt)) return { job, run: false };
    const next = { ...job, modules: patchLesson(job, lessonId, { status: 'running', startedAt: nowIso(), error: undefined }) };
    tx.update(ref, { modules: next.modules, updated_at: nowIso() });
    return { job: next, run: true };
  });
  if (!claim.run) return claim.job;

  const job = claim.job;
  const modules = job.modules!;
  const quizModule = modules.find((m) => m.lessons.some((l) => l.id === lessonId && isQuiz(l)));
  if (quizModule) return writeQuiz(job, quizModule, lessonId);

  // Quizzes are not part of the reading order the writer is told about.
  const order = modules.flatMap((m) => m.lessons.filter((l) => !isQuiz(l)).map((l) => ({ module: m, lesson: l })));
  const index = order.findIndex((x) => x.lesson.id === lessonId);
  const { module, lesson } = order[index];
  const planModule = job.plan.modules.find((m) => m.key === module.key) ?? job.plan.modules[0];
  const taught = module.lessons.filter((l) => !isQuiz(l));

  let status: LessonStatus = 'done';
  let error: string | undefined;
  try {
    const generated = await generateLesson({
      plan: job.plan,
      module: planModule,
      moduleTitle: module.title,
      lesson,
      previousTitles: order.slice(0, index).map((x) => x.lesson.title),
      nextTitle: order[index + 1]?.lesson.title,
      isWorkshop: taught.length > 1 && taught[taught.length - 1].id === lessonId,
    });
    const content: Omit<LessonContent, 'createdAt' | 'updatedAt' | 'version'> = {
      id: lessonContentId(lessonId),
      courseId: job.course_id,
      lessonId,
      type: 'text',
      body: `${generated.body}\n\n${EXERCISE_PREFIX}${generated.exercise}`,
      attachmentAssetIds: [],
      keyPoints: generated.keyPoints,
      callout: generated.callout,
      ...(generated.mermaid ? { diagram: generated.mermaid } : {}),
      checkpoint: {
        stem: generated.checkpoint.stem,
        options: generated.checkpoint.options,
        correctOptionIds: [generated.checkpoint.correctOptionId],
        explanation: generated.checkpoint.explanation,
      },
    };
    const repo = lmsRepos().lessonContent;
    const { created } = await repo.createIfAbsent(content.id, content);
    if (!created) await repo.update(content.id, content);
  } catch (err) {
    console.error(`Lesson ${lessonId} failed:`, err);
    status = 'error';
    error = 'This lesson could not be written. Retrying…';
  }

  return db().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as CourseJob;
    const next = { ...current, modules: patchLesson(current, lessonId, { status, error, startedAt: undefined }) };
    tx.update(ref, { modules: next.modules, updated_at: nowIso() });
    return next;
  });
}

/* ─────────────────────────────────── quizzes ─────────────────────────────────── */

const assessmentIdFor = (quizLessonId: string) => `asm_${quizLessonId}`;

function payloadOf(q: QuizQuestion): { payload: QuestionPayload; key: AnswerKey } {
  if (q.type === 'true_false') {
    return { payload: { kind: 'true_false' }, key: { kind: 'true_false', correct: q.correctOptionIds[0] === 'true' } };
  }
  if (q.type === 'mcq_multi') {
    return {
      payload: { kind: 'mcq_multi', options: q.options, shuffle: true },
      key: { kind: 'mcq_multi', correctOptionIds: q.correctOptionIds, partialCredit: false },
    };
  }
  return {
    payload: { kind: 'mcq_single', options: q.options, shuffle: true },
    key: { kind: 'mcq_single', correctOptionId: q.correctOptionIds[0] },
  };
}

/** Writes a module's quiz into the assessment brick: questions, their keys (apart), and the quiz. */
async function writeQuiz(job: CourseJob, module: JobModule, quizLessonId: string): Promise<CourseJob> {
  const ref = jobRef(job.id);
  const taught = module.lessons.filter((l) => !isQuiz(l));
  let patch: Partial<JobLesson> = { status: 'done', startedAt: undefined, error: undefined };
  try {
    const contents = await Promise.all(taught.map((l) => lmsRepos().lessonContent.get(lessonContentId(l.id))));
    const questions = await generateModuleQuiz({
      plan: job.plan,
      moduleTitle: module.title,
      lessons: taught.map((l, i) => ({ title: l.title, brief: l.brief, keyPoints: contents[i]?.keyPoints ?? [] })),
    });

    const repos = assessmentRepos();
    const assessmentId = assessmentIdFor(quizLessonId);
    const stored = await Promise.all(
      questions.map(async (q, i) => {
        const id = `q_${quizLessonId}_${i + 1}`;
        const { payload, key } = payloadOf(q);
        const question: Omit<Question, 'createdAt' | 'updatedAt' | 'version'> = {
          id,
          bankId: assessmentId,
          type: q.type,
          stem: q.stem,
          payload,
          points: q.points,
          difficulty: q.difficulty,
          tags: [module.key],
          explanation: q.explanation,
        };
        const { created } = await repos.questions.createIfAbsent(id, question);
        if (!created) await repos.questions.update(id, question);
        const keyId = questionKeyId(id);
        const keyRow = { id: keyId, questionId: id, key };
        const k = await repos.questionKeys.createIfAbsent(keyId, keyRow);
        if (!k.created) await repos.questionKeys.update(keyId, keyRow);
        return { id, points: q.points };
      }),
    );
    const quiz: Omit<Assessment, 'createdAt' | 'updatedAt' | 'version'> = {
      id: assessmentId,
      ownerRef: `lms:lesson:${quizLessonId}`,
      mode: 'quiz',
      title: module.lessons.find((l) => l.id === quizLessonId)?.title ?? `Quiz: ${module.title}`,
      description: `Covers: ${taught.map((l) => l.title).join('; ')}`,
      selection: { mode: 'fixed', questionIds: stored.map((q) => q.id) },
      policy: QUIZ_POLICY,
      totalPoints: stored.reduce((sum, q) => sum + q.points, 0),
      active: true,
    };
    const { created } = await repos.assessments.createIfAbsent(assessmentId, quiz);
    if (!created) await repos.assessments.update(assessmentId, quiz);
    patch = { ...patch, assessmentId };
  } catch (err) {
    console.error(`Quiz ${quizLessonId} failed:`, err);
    patch = { status: 'error', startedAt: undefined, error: 'This quiz could not be written. Retrying…' };
  }

  return db().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as CourseJob;
    const next = { ...current, modules: patchLesson(current, quizLessonId, patch) };
    tx.update(ref, { modules: next.modules, updated_at: nowIso() });
    return next;
  });
}

/* ────────────────────────────────── finish ─────────────────────────────────── */

export async function finishCourse(userId: string, reportId: string): Promise<CourseJob> {
  const ref = jobRef(reportId);
  const claim = await db().runTransaction(async (tx) => {
    const job = (await tx.get(ref)).data() as CourseJob | undefined;
    if (!job || job.user_id !== userId || !job.modules) throw new CourseError('Course not found.', 404);
    if (job.status === 'ready') return { job, run: false };
    if (job.status === 'publishing' && !isStale(job.step_started_at)) return { job, run: false };
    const pending = job.modules.flatMap((m) => m.lessons).filter((l) => l.status !== 'done');
    if (pending.length > 0) throw new CourseError(`${pending.length} lessons are still being written.`, 409);
    tx.update(ref, { status: 'publishing', step_started_at: nowIso(), updated_at: nowIso() });
    return { job: { ...job, status: 'publishing' as const }, run: true };
  });
  if (!claim.run) return claim.job;
  const job = claim.job;

  try {
    const service = lms();
    const courses = lmsRepos().courses;
    const courseValue: Omit<Course, 'createdAt' | 'updatedAt' | 'version'> = {
      id: job.course_id,
      instructorIds: [],
      ownerId: userId,
      slug: job.course_id,
      title: job.title ?? 'Your gap-closing course',
      subtitle: job.subtitle,
      description: job.description ?? '',
      tags: ['istartup', 'gap-course', ...job.plan.modules.map((m) => m.key)],
      level: 'beginner',
      language: 'en',
      priceMinor: 0,
      currency: 'usd',
      // Personal to one founder: never listed in a catalogue, enrolled directly below.
      enrollmentMode: 'invite',
      prerequisiteCourseIds: [],
      status: 'draft',
      curriculumVersion: 0,
      // Quizzes must be passed, not merely opened, for the course to finish.
      completionRule: {
        kind: 'all_required',
        requireAssessmentsPassed: job.modules!.some((m) => m.lessons.some(isQuiz)),
      },
      dripMode: 'none',
      certificateEnabled: true,
      enrollmentCount: 0,
      ratingCount: 0,
      ratingSum: 0,
    };
    const { entity: course } = await courses.createIfAbsent(job.course_id, courseValue);

    if (course.curriculumVersion === 0) {
      const sections: CurriculumSection[] = job.modules!.map((m) => ({
        id: m.id,
        title: m.title,
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          type: 'text' as const,
          durationSec: l.durationMin * 60,
          required: true,
          previewable: false,
          ...(l.assessmentId ? { assessmentId: l.assessmentId } : {}),
        })),
      }));
      await service.publishCurriculum({ courseId: job.course_id, sections });
    }
    if (course.status !== 'published') await service.publishCourse(job.course_id);

    const paid = (await entitlements(userId)).course;
    const enrolled = await service.enroll({
      courseId: job.course_id,
      userId,
      source: job.created_by ? 'admin' : paid ? 'purchase' : 'free',
    });
    if (!enrolled.ok && enrolled.code !== 'already_enrolled') throw new Error(enrolled.message);

    await ref.update({ status: 'ready', error: null, updated_at: nowIso() });
    return { ...job, status: 'ready', error: undefined };
  } catch (error) {
    console.error('Course publish failed:', error);
    await ref.update({ status: 'writing', error: 'Publishing failed. Retrying…', updated_at: nowIso() });
    throw new CourseError('We could not publish your course. Try again.', 500);
  }
}
