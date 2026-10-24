import { aiPrices } from '@/lib/ai-pricing';
import type { AiUsageRow } from '@/lib/ai-usage';
import { currentAdmin, unauthorized } from '@/lib/admin-guard';
import { col, isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FEATURES = [
  { key: 'outline', label: 'Course outline', note: 'One per course: modules, lessons and briefs' },
  { key: 'lesson', label: 'Lesson writing', note: 'One per lesson: body, diagram, key points, exercise, checkpoint' },
  { key: 'quiz', label: 'Module quiz', note: 'One per module: six graded questions' },
  { key: 'narration', label: 'Slide narration', note: 'One per slide recording (Gemini TTS); replays of a stored clip are free and not counted' },
] as const;

const avg = (sum: number, n: number) => (n ? sum / n : 0);

/**
 * GET /api/admin/ai-costs — what our AI features cost, from `istartup_ai_usage` (one row
 * per model call, priced at the rates in lib/ai-pricing.ts). Per feature: real calls,
 * cache hits, average and total cost, average tokens and latency, and what the cache
 * saved; plus the average cost of a whole generated course and the last 30 days of spend.
 */
export async function GET() {
  if (!(await currentAdmin())) return unauthorized();
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });

  try {
    const snap = await col('aiUsage').limit(50_000).get();
    const rows = snap.docs.map((d) => d.data() as AiUsageRow);

    const features = FEATURES.map((f) => {
      const mine = rows.filter((r) => r.feature === f.key);
      const misses = mine.filter((r) => r.cache === 'miss');
      const hits = mine.length - misses.length;
      const sum = (key: keyof AiUsageRow, list = misses) => list.reduce((a, r) => a + ((r[key] as number) ?? 0), 0);
      return {
        key: f.key,
        label: f.label,
        note: f.note,
        calls: misses.length,
        hits,
        hitRate: mine.length ? Math.round((hits / mine.length) * 100) : 0,
        totalUsd: sum('cost_usd'),
        avgUsd: avg(sum('cost_usd'), misses.length),
        avgInputTokens: Math.round(avg(sum('input_tokens'), misses.length)),
        avgOutputTokens: Math.round(avg(sum('output_tokens'), misses.length)),
        avgThoughtsTokens: Math.round(avg(sum('thoughts_tokens'), misses.length)),
        avgSeconds: Math.round(avg(sum('duration_ms'), misses.length) / 100) / 10,
        savedUsd: sum('saved_usd', mine),
      };
    });

    // A course's cost: every real call made while generating it.
    const byCourse = new Map<string, number>();
    for (const r of rows) {
      if (!r.course_id || r.cache !== 'miss') continue;
      byCourse.set(r.course_id, (byCourse.get(r.course_id) ?? 0) + r.cost_usd);
    }
    const courseCosts = [...byCourse.values()];

    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const byDay = new Map<string, number>();
    for (const r of rows) {
      if (Date.parse(r.at) < since || r.cache !== 'miss') continue;
      const day = r.at.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + r.cost_usd);
    }

    const totalUsd = features.reduce((a, f) => a + f.totalUsd, 0);
    const savedUsd = features.reduce((a, f) => a + f.savedUsd, 0);
    return Response.json({
      prices: aiPrices(),
      since: rows.reduce<string | null>((min, r) => (!min || r.at < min ? r.at : min), null),
      totalUsd,
      savedUsd,
      calls: features.reduce((a, f) => a + f.calls, 0),
      hits: features.reduce((a, f) => a + f.hits, 0),
      features,
      courses: courseCosts.length,
      avgCourseUsd: avg(courseCosts.reduce((a, c) => a + c, 0), courseCosts.length),
      // Cost per day in micro-dollars, so the daily chart's integer counts stay readable.
      daily: [...byDay].map(([day, usd]) => ({ day, count: Math.round(usd * 1_000_000) })),
    });
  } catch (error) {
    console.error('AI cost report failed:', error);
    return Response.json({ error: 'Could not build the cost report.' }, { status: 500 });
  }
}
