import type { CourseJob } from './service';
import type { PublicCourseJob } from './shared';

/** What the client sees of a job: no plan internals, no other founder's data. */
export function publicJob(job: CourseJob): PublicCourseJob {
  return {
    reportId: job.id,
    courseId: job.course_id,
    status: job.status,
    title: job.title ?? null,
    subtitle: job.subtitle ?? null,
    error: job.error ?? null,
    plan: job.plan.modules.map((m) => ({ key: m.key, title: m.title, percent: m.percent, gaps: m.focus.map((f) => f.title) })),
    modules: (job.modules ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, status: l.status, kind: l.kind ?? 'lesson' })),
    })),
  };
}
