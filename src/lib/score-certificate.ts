import { companyForUser, isMember } from '@/lib/company';
import { col, isId } from '@/lib/db';
import type { ReportRow } from '@/lib/reports';
import { MAX_SCORE } from '@/modules/istartup-score/assessment/bank';
import { bandFor } from '@/modules/istartup-score/assessment/scoring';

/** Everything the company's Readiness Certificate prints, from a saved report. */
export interface ScoreCertificateData {
  reportId: string;
  startupName: string;
  score: number;
  maxScore: number;
  band: string;
  dimensions: Array<{ label: string; percent: number }>;
  issuedAt: number;
}

export function scoreCertificateFrom(report: ReportRow): ScoreCertificateData {
  const scores = Array.isArray(report.scores) ? (report.scores as Array<{ category: string; score: number }>) : [];
  return {
    reportId: report.id,
    startupName: report.startup_name,
    score: report.final_score,
    maxScore: MAX_SCORE,
    band: bandFor(report.final_score).label,
    dimensions: scores.map((s) => ({ label: s.category, percent: s.score })),
    issuedAt: Date.parse(report.created_at),
  };
}

/**
 * The certificate for one report, or null when it doesn't exist or `userId` isn't on the
 * company it belongs to (the founder who took it, or any of their co-founders).
 */
export async function getScoreCertificate(reportId: string, userId: string): Promise<ScoreCertificateData | null> {
  if (!isId(reportId)) return null;
  const snap = await col('reports').doc(reportId).get();
  if (!snap.exists) return null;
  const report = { id: snap.id, ...snap.data() } as ReportRow & { company_id?: string };
  if (report.user_id !== userId) {
    const company = report.user_id ? await companyForUser(report.user_id) : null;
    if (!isMember(company, userId)) return null;
  }
  return scoreCertificateFrom(report);
}
