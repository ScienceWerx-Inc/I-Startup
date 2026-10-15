import { lmsRepos } from '@/brico/lms';
import {
  curriculumId,
  enrollmentId,
  isBitSet,
  progressId,
  type Certificate,
  type Course,
  type Curriculum,
  type Enrollment,
  type Progress,
} from '@/features/lms/domain';

import { getJob, reportIdFor, type CourseJob } from './service';

/** Everything a course page renders, for one founder. Null when it isn't theirs. */
export interface CourseView {
  job: CourseJob;
  course: Course | null;
  enrollment: Enrollment | null;
  curriculum: Curriculum | null;
  progress: Progress | null;
  completed: Set<string>;
  certificate: Certificate | null;
}

export async function getCourseView(userId: string, courseId: string): Promise<CourseView | null> {
  const reportId = reportIdFor(courseId);
  if (!reportId || !/^[0-9a-f-]{36}$/i.test(reportId)) return null;
  const job = await getJob(userId, reportId);
  if (!job) return null;

  const repos = lmsRepos();
  const [course, enrollment, progress] = await Promise.all([
    repos.courses.get(courseId),
    repos.enrollments.get(enrollmentId(courseId, userId)),
    repos.progress.get(progressId(courseId, userId)),
  ]);
  // The learner's pinned version, never the latest: their denominator must not move.
  const curriculum = enrollment
    ? await repos.curricula.get(curriculumId(courseId, enrollment.curriculumVersion))
    : null;
  const certificate = enrollment?.certificateId ? await repos.certificates.get(enrollment.certificateId) : null;

  const completed = new Set<string>();
  if (curriculum && progress) {
    curriculum.lessonOrder.forEach((id, i) => {
      if (isBitSet(progress.completedBitmap, i)) completed.add(id);
    });
  }
  return { job, course, enrollment, curriculum, progress, completed, certificate };
}

/** A founder's courses with progress, newest first — for the /learn list. */
export async function listCourseCards(userId: string, jobs: CourseJob[]) {
  const repos = lmsRepos();
  return Promise.all(
    jobs.map(async (job) => {
      const [progress, enrollment] =
        job.status === 'ready'
          ? await Promise.all([
              repos.progress.get(progressId(job.course_id, userId)),
              repos.enrollments.get(enrollmentId(job.course_id, userId)),
            ])
          : [null, null];
      const lessons = (job.modules ?? []).flatMap((m) => m.lessons);
      return {
        courseId: job.course_id,
        reportId: job.id,
        title: job.title ?? 'Designing your course…',
        subtitle: job.subtitle ?? null,
        status: job.status,
        startup: job.plan.startup.name,
        score: job.plan.finalScore,
        modules: job.plan.modules.map((m) => m.title),
        lessonsTotal: lessons.length,
        lessonsWritten: lessons.filter((l) => l.status === 'done').length,
        percent: progress?.percent ?? 0,
        certificateId: enrollment?.certificateId ?? null,
        createdAt: job.created_at,
      };
    }),
  );
}
