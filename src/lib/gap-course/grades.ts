import { lmsRepos } from '@/brico/lms';
import { enrollmentId } from '@/features/lms/domain';
import { col, nowIso } from '@/lib/db';

import { loadAttemptIndexes, quizScoreOf } from './quiz-scores';
import type { CourseJob } from './service';

/**
 * A founder's grade on a course: the average of their best attempt on each module quiz,
 * as a percent and a letter. Stored per founder in `istartup_course_grades`, grouped by
 * `company_id` so the admin sees a team's grades together, and frozen once the course is
 * completed — the 411 Certificate prints the grade at the moment it was earned.
 */

export type Letter = 'A' | 'B' | 'C' | 'D' | 'F';

/** A 90+, B 80+, C 70+ (the pass mark), D 60+, F below. */
export function letterFor(percent: number): Letter {
  if (percent >= 90) return 'A';
  if (percent >= 80) return 'B';
  if (percent >= 70) return 'C';
  if (percent >= 60) return 'D';
  return 'F';
}

export interface CourseGrade {
  company_id: string | null;
  course_id: string;
  user_id: string;
  name: string;
  /** Average best percent over the quizzes attempted; null before any attempt. */
  percent: number | null;
  letter: Letter | null;
  quizzes: number;
  attempted: number;
  passed: number;
  completed_at: number | null;
  certificate_code: string | null;
  updated_at: string;
}

export const gradeId = (courseId: string, userId: string) => `${courseId}_${userId}`;

/** Recomputes and stores one founder's grade (left untouched once the course is completed). */
export async function upsertCourseGrade(job: CourseJob, userId: string, name: string): Promise<CourseGrade> {
  const ref = col('courseGrades').doc(gradeId(job.course_id, userId));
  const current = await ref.get();
  if (current.exists && current.get('completed_at')) return current.data() as CourseGrade;

  const [indexes, enrollment] = await Promise.all([
    loadAttemptIndexes(userId),
    lmsRepos().enrollments.get(enrollmentId(job.course_id, userId)),
  ]);
  const score = quizScoreOf({ ...job, user_id: userId }, indexes);
  const certificate = enrollment?.certificateId ? await lmsRepos().certificates.get(enrollment.certificateId) : null;
  const grade: CourseGrade = {
    company_id: job.company_id ?? null,
    course_id: job.course_id,
    user_id: userId,
    name,
    percent: score?.percent ?? null,
    letter: score?.percent != null ? letterFor(score.percent) : null,
    quizzes: score?.quizzes ?? 0,
    attempted: score?.attempted ?? 0,
    passed: score?.passed ?? 0,
    completed_at: enrollment?.status === 'completed' ? (enrollment.completedAt ?? null) : null,
    certificate_code: certificate?.code ?? null,
    updated_at: nowIso(),
  };
  await ref.set(grade);
  return grade;
}

export async function getCourseGrade(courseId: string, userId: string): Promise<CourseGrade | null> {
  const snap = await col('courseGrades').doc(gradeId(courseId, userId)).get();
  return snap.exists ? (snap.data() as CourseGrade) : null;
}

/** Every stored grade on one course (all its founders). */
export async function gradesForCourse(courseId: string): Promise<CourseGrade[]> {
  const snap = await col('courseGrades').where('course_id', '==', courseId).get();
  return snap.docs.map((d) => d.data() as CourseGrade);
}

/** Every stored grade of one company: the team, across its courses. */
export async function gradesForCompany(companyId: string): Promise<CourseGrade[]> {
  const snap = await col('courseGrades').where('company_id', '==', companyId).get();
  return snap.docs.map((d) => d.data() as CourseGrade);
}
