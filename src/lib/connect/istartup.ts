import type { Certificate } from '@/features/lms/domain';
import { certificateVerification } from '@/lib/certificate-verify';
import { certificateExpiry } from '@/lib/gap-course/shared';
import type { ReportRow } from '@/lib/reports';
import { scoreCertificateFrom } from '@/lib/score-certificate';
import { scoreCertificateCode } from '@/lib/score-certificate-code';

import {
  MAX_LINE_VALUE,
  MAX_LINES,
  SELF,
  type CertificatesResponse,
  type ConnectCard,
  type ConnectCardLine,
  type ConnectCertificate,
  type SummaryResponse,
} from './types';

/**
 * What iStartup tells a peer about one founder — pure builders over already-loaded rows,
 * so they're testable without Firestore. Loading lives in `istartup-data.ts`.
 */

export const ISSUER = 'iStartup Score';

/** The few course fields the summary needs (a subset of `listCourseCards` rows). */
export interface CourseSummary {
  title: string;
  status: string;
  percent: number;
  certificateId: string | null;
  updatedAt: string;
}

const clip = (s: string) => (s.length > MAX_LINE_VALUE ? `${s.slice(0, MAX_LINE_VALUE - 1)}…` : s);
const latest = (...isos: Array<string | null | undefined>) =>
  isos.filter((s): s is string => Boolean(s) && Number.isFinite(Date.parse(s!))).sort().at(-1) ?? null;

/** The lowest-scoring dimension(s) of a report; ties are all named. */
export function weakestDimensions(dimensions: Array<{ label: string; percent: number }>): string[] {
  if (!dimensions.length) return [];
  const low = Math.min(...dimensions.map((d) => d.percent));
  return dimensions.filter((d) => d.percent === low).map((d) => d.label);
}

export function buildSummaryCard(input: {
  report: ReportRow | null;
  courses: CourseSummary[];
  origin: string;
}): ConnectCard {
  const { report, origin } = input;
  const lines: ConnectCardLine[] = [];
  let headline = 'Assessment not taken yet';

  if (report) {
    const cert = scoreCertificateFrom(report);
    headline = `${cert.score} / ${cert.maxScore} · ${cert.band}`;
    const weakest = weakestDimensions(cert.dimensions);
    if (weakest.length) lines.push({ label: weakest.length > 1 ? 'Weakest areas' : 'Weakest area', value: weakest.join(', ') });
    if (report.startup_name?.trim()) lines.push({ label: 'Startup', value: report.startup_name.trim() });
    lines.push({ label: 'Assessed', value: new Date(cert.issuedAt).toISOString().slice(0, 10) });
  }

  // The newest course the founder can take (ready, or still being written).
  const course = input.courses.find((c) => c.status === 'ready') ?? input.courses[0];
  if (course) {
    const progress =
      course.status !== 'ready' ? 'being prepared'
      : course.certificateId ? 'complete, certified'
      : `${course.percent}% complete`;
    lines.push({ label: 'Course', value: `${course.title} · ${progress}` });
  }

  return {
    title: 'iStartup readiness',
    headline,
    lines: lines.slice(0, MAX_LINES).map((l) => ({ label: l.label, value: clip(l.value) })),
    url: `${origin}${course ? '/learn' : '/interview'}`,
    updatedAt: latest(report?.created_at, course?.updatedAt) ?? new Date().toISOString(),
  };
}

export function courseCertificate(certificate: Certificate, origin: string, now = Date.now()): ConnectCertificate {
  const v = certificateVerification(certificate, now);
  return {
    code: v.code,
    title: v.courseTitle,
    issuer: ISSUER,
    issuedAt: v.issuedAt,
    expiresAt: v.expiresAt,
    status: v.status === 'revoked' ? 'REVOKED' : v.status === 'expired' ? 'EXPIRED' : 'VALID',
    verifyUrl: `${origin}/verify/${encodeURIComponent(v.code)}`,
  };
}

/**
 * The Readiness Certificate issued with a report. It has no public verify page (the
 * certificate page is the founder's own, behind sign-in), so the link is that page.
 */
export function readinessCertificate(report: ReportRow, origin: string, now = Date.now()): ConnectCertificate {
  const cert = scoreCertificateFrom(report);
  const expires = certificateExpiry(cert.issuedAt);
  const name = cert.startupName?.trim();
  return {
    code: scoreCertificateCode(report.id),
    title: `iSTARTUP Readiness Certificate${name ? ` · ${name}` : ''} (${cert.score}/${cert.maxScore})`,
    issuer: ISSUER,
    issuedAt: new Date(cert.issuedAt).toISOString(),
    expiresAt: expires.toISOString(),
    status: expires.getTime() <= now ? 'EXPIRED' : 'VALID',
    verifyUrl: `${origin}/certificate/${report.id}`,
  };
}

export function buildCertificates(input: {
  courseCertificates: Certificate[];
  latestReport: ReportRow | null;
  origin: string;
  now?: number;
}): ConnectCertificate[] {
  const now = input.now ?? Date.now();
  const out = [...input.courseCertificates]
    .sort((a, b) => b.issuedAt - a.issuedAt)
    .map((c) => courseCertificate(c, input.origin, now));
  if (input.latestReport) out.unshift(readinessCertificate(input.latestReport, input.origin, now));
  return out;
}

/* ───────────────────────────── answering a peer ───────────────────────────── */

/** Where the provider reads one founder from (Firestore in the app, fakes in tests). */
export interface FounderDirectory {
  /** The account with exactly this (lower-cased) email, or null. */
  findByEmail(email: string): Promise<{ id: string; email: string; email_verified_at?: string | null } | null>;
  latestReport(userId: string): Promise<ReportRow | null>;
  /** Newest first. */
  courses(userId: string): Promise<CourseSummary[]>;
  courseCertificates(userId: string): Promise<Certificate[]>;
}

/**
 * The founder a peer may hear about: the account must exist and have proved it owns the
 * address. An unverified account answers exactly like an unknown one.
 */
async function verifiedFounder(email: string, dir: FounderDirectory) {
  const user = await dir.findByEmail(email.trim().toLowerCase());
  if (!user || !user.email_verified_at || user.email.toLowerCase() !== email.trim().toLowerCase()) return null;
  return user;
}

export async function summaryFor(email: string, dir: FounderDirectory, origin: string): Promise<SummaryResponse> {
  const user = await verifiedFounder(email, dir);
  if (!user) return { app: SELF, found: false };
  const [report, courses] = await Promise.all([dir.latestReport(user.id), dir.courses(user.id)]);
  return { app: SELF, found: true, card: buildSummaryCard({ report, courses, origin }) };
}

export async function certificatesFor(
  email: string,
  dir: FounderDirectory,
  origin: string,
  now = Date.now(),
): Promise<CertificatesResponse> {
  const user = await verifiedFounder(email, dir);
  if (!user) return { app: SELF, found: false };
  const [latestReport, courseCertificates] = await Promise.all([dir.latestReport(user.id), dir.courseCertificates(user.id)]);
  return { app: SELF, found: true, certificates: buildCertificates({ courseCertificates, latestReport, origin, now }) };
}
