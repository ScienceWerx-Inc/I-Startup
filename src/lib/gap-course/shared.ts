/**
 * Shared by server and client: no imports, so a client component can use it without
 * pulling firebase-admin into the browser bundle.
 */

/** The exercise is stored as the lesson body's last paragraph, marked with this prefix. */
export const EXERCISE_PREFIX = 'Your exercise: ';

export type JobStatus = 'outlining' | 'writing' | 'publishing' | 'ready' | 'error';
export type LessonStatus = 'pending' | 'running' | 'done' | 'error';

/** What `/api/course` returns for a job. */
export interface PublicCourseJob {
  reportId: string;
  courseId: string;
  status: JobStatus;
  title: string | null;
  subtitle: string | null;
  error: string | null;
  plan: { key: string; title: string; percent: number; gaps: string[] }[];
  modules: { id: string; title: string; lessons: { id: string; title: string; status: LessonStatus }[] }[];
}
