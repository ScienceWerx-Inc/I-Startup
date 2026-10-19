import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { col, isDatabaseConfigured, rows as fetchRows } from '@/lib/db';
import type { ReportRow } from '@/lib/reports';
import { QUESTIONS, sectionOf } from '@/modules/istartup-score/assessment/bank';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DimTotal {
  sum: number;
  n: number;
}

/**
 * GET /api/admin/stats — admin-only aggregates over the istartup_reports collection:
 * totals, average score, band + country + daily distributions, per-dimension averages, and
 * the gaps (answers of 1–2) founders hit most often.
 */
export async function GET() {
  if (!(await currentAdmin())) return unauthorized();

  if (!isDatabaseConfigured()) {
    return Response.json({ error: 'Database not configured.' }, { status: 503 });
  }

  try {
    const rows = await fetchRows<ReportRow>(
      col('reports')
        .orderBy('created_at', 'desc')
        .limit(2000)
        .select('final_score', 'band', 'country', 'region', 'city', 'scores', 'answers', 'created_at'),
    );

    const byBand: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const dims: Record<string, DimTotal> = {};
    const gapCounts: Record<string, number> = {};
    let sum = 0;

    for (const r of rows) {
      sum += r.final_score;
      byBand[r.band] = (byBand[r.band] ?? 0) + 1;
      const c = r.country ?? 'Unknown';
      byCountry[c] = (byCountry[c] ?? 0) + 1;
      if (r.city) {
        const key = r.country ? `${r.city}, ${r.country}` : r.city;
        byCity[key] = (byCity[key] ?? 0) + 1;
      }
      const day = new Date(r.created_at).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + 1;
      const answers = (r.answers ?? {}) as Record<string, unknown>;
      for (const q of QUESTIONS) {
        const v = answers[q.id];
        if (typeof v === 'number' && v >= 1 && v <= 2) gapCounts[q.id] = (gapCounts[q.id] ?? 0) + 1;
      }
      if (Array.isArray(r.scores)) {
        for (const s of r.scores as Array<{ category?: string; score?: number }>) {
          if (typeof s.category === 'string' && typeof s.score === 'number') {
            dims[s.category] = dims[s.category] ?? { sum: 0, n: 0 };
            dims[s.category].sum += s.score;
            dims[s.category].n += 1;
          }
        }
      }
    }

    const sortDesc = (m: Record<string, number>) =>
      Object.entries(m)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

    const days = Object.entries(byDay)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => (a.day < b.day ? -1 : 1))
      .slice(-30);

    const dimAvg = Object.entries(dims)
      .map(([label, t]) => ({ label, avg: Math.round((t.sum / t.n) * 10) / 10 }))
      .sort((a, b) => b.avg - a.avg);

    const commonGaps = QUESTIONS.filter((q) => gapCounts[q.id])
      .map((q) => ({ id: q.id, title: q.title, section: sectionOf(q.category).title, count: gapCounts[q.id] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return Response.json({
      total: rows.length,
      avgScore: rows.length ? Math.round((sum / rows.length) * 10) / 10 : 0,
      byBand: sortDesc(byBand),
      byCountry: sortDesc(byCountry).slice(0, 15),
      byCity: sortDesc(byCity).slice(0, 15),
      byDay: days,
      dimAvg,
      commonGaps,
      note: 'Location is approximate (IP geolocation at submit time); rows before geo capture show as Unknown.',
    });
  } catch (error) {
    console.error('Failed to compute stats:', error);
    return Response.json({ error: 'Failed to compute stats.' }, { status: 500 });
  }
}
