import { getUser } from '@/lib/account';
import { col, isId } from '@/lib/db';
import type { ReportRow } from '@/lib/reports';
import { MAX_SCORE } from '@/modules/istartup-score/assessment/bank';
import { bandFor } from '@/modules/istartup-score/assessment/scoring';

/** Everything the Readiness Certificate prints, from a saved report. */
export interface ScoreCertificateData {
  reportId: string;
  startupName: string;
  founderName: string | null;
  score: number;
  maxScore: number;
  band: string;
  dimensions: Array<{ label: string; percent: number }>;
  issuedAt: number;
}

export function scoreCertificateFrom(report: ReportRow, founderName: string | null): ScoreCertificateData {
  const scores = Array.isArray(report.scores) ? (report.scores as Array<{ category: string; score: number }>) : [];
  return {
    reportId: report.id,
    startupName: report.startup_name,
    founderName,
    score: report.final_score,
    maxScore: MAX_SCORE,
    band: bandFor(report.final_score).label,
    dimensions: scores.map((s) => ({ label: s.category, percent: s.score })),
    issuedAt: Date.parse(report.created_at),
  };
}

/** The certificate for one report, or null when it doesn't exist or isn't `userId`'s. */
export async function getScoreCertificate(reportId: string, userId: string): Promise<ScoreCertificateData | null> {
  if (!isId(reportId)) return null;
  const snap = await col('reports').doc(reportId).get();
  if (!snap.exists || snap.get('user_id') !== userId) return null;
  const user = await getUser(userId);
  return scoreCertificateFrom({ id: snap.id, ...snap.data() } as ReportRow, user?.full_name || user?.email || null);
}
