import { lms, lmsRepos } from '@/brico/lms';
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

import { getJob, getJobById, reportIdFor, type CourseJob } from './service';
import { certificateExpiry } from './shared';

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

const reportIdOf = (courseId: string) => {
  const reportId = reportIdFor(courseId);
  return reportId && /^[0-9a-f-]{36}$/i.test(reportId) ? reportId : null;
};

/**
 * A course as `userId` sees it: their own enrolment, progress and certificate, whether
 * they are the founder it was built for or a co-founder on the same company. A joined
 * member who isn't enrolled yet (they joined after it was published) is enrolled here.
 */
export async function getCourseView(userId: string, courseId: string): Promise<CourseView | null> {
  const reportId = reportIdOf(courseId);
  const job = reportId ? await getJob(userId, reportId) : null;
  if (!job) return null;
  const view = await loadCourseView(job, userId);
  if (job.status === 'ready' && view.course?.status === 'published' && !view.enrollment && job.user_id !== userId) {
    const enrolled = await lms().enroll({ courseId, userId, source: 'invite' });
    if (enrolled.ok || enrolled.code === 'already_enrolled') return loadCourseView(job, userId);
  }
  return view;
}

/**
 * Any founder's course, for the admin console, as `userId` (a member) saw it, the founder
 * it was built for by default. The caller must have checked admin access.
 */
export async function getCourseViewForAdmin(courseId: string, userId?: string): Promise<CourseView | null> {
  const reportId = reportIdOf(courseId);
  const job = reportId ? await getJobById(reportId) : null;
  return job ? loadCourseView(job, userId ?? job.user_id) : null;
}

async function loadCourseView(job: CourseJob, userId: string): Promise<CourseView> {
  const { course_id: courseId } = job;
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

/** Courses with their learner's progress, in the order given — for /learn and the admin console. */
export async function listCourseCards(jobs: CourseJob[], viewerId?: string) {
  const repos = lmsRepos();
  return Promise.all(
    jobs.map(async (job) => {
      // Progress is the viewer's own; for the admin lists, the founder it was built for.
      const userId = viewerId ?? job.user_id;
      const [progress, enrollment] =
        job.status === 'ready'
          ? await Promise.all([
              repos.progress.get(progressId(job.course_id, userId)),
              repos.enrollments.get(enrollmentId(job.course_id, userId)),
            ])
          : [null, null];
      const lessons = (job.modules ?? []).flatMap((m) => m.lessons);
      const certificate = enrollment?.certificateId ? await repos.certificates.get(enrollment.certificateId) : null;
      return {
        courseId: job.course_id,
        reportId: job.id,
        userId,
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
        certificateExpiresAt: certificate ? certificateExpiry(certificate.issuedAt).toISOString() : null,
        createdBy: job.created_by ?? null,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      };
    }),
  );
}
