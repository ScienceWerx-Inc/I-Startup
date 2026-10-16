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

/** The certificate a completed course earns. */
export const CERTIFICATE_NAME = '411 Certificate';

/** A 411 Certificate is valid for this many calendar months from the day it is issued. */
export const CERTIFICATE_VALID_MONTHS = 6;

/** When a certificate issued at `issuedAtMs` expires (same day of month, 6 months on; clamped at month end). */
export function certificateExpiry(issuedAtMs: number): Date {
  const issued = new Date(issuedAtMs);
  const expiry = new Date(issued);
  expiry.setUTCDate(1);
  expiry.setUTCMonth(expiry.getUTCMonth() + CERTIFICATE_VALID_MONTHS);
  const lastDay = new Date(Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth() + 1, 0)).getUTCDate();
  expiry.setUTCDate(Math.min(issued.getUTCDate(), lastDay));
  return expiry;
}

export const isCertificateExpired = (issuedAtMs: number, now = Date.now()) =>
  certificateExpiry(issuedAtMs).getTime() <= now;
