import { randomUUID } from 'node:crypto';

import { costOf, type TokenUsage } from '@/lib/ai-pricing';
import { col, nowIso } from '@/lib/db';

/**
 * One row per model call in `istartup_ai_usage`, for the admin cost report: the feature
 * (outline, lesson, quiz), whether the memo cache answered it, its tokens and USD cost —
 * and, for a cache hit, what the call it replaced would have cost.
 */

export interface AiUsageRow {
  feature: 'outline' | 'lesson' | 'quiz';
  cache: 'miss' | 'hit';
  input_tokens: number;
  output_tokens: number;
  thoughts_tokens: number;
  cost_usd: number;
  saved_usd: number;
  duration_ms: number;
  course_id: string | null;
  at: string;
}

/** Best effort: metering never fails or slows a generation. */
export function recordAiUsage(input: {
  feature: AiUsageRow['feature'];
  cache: AiUsageRow['cache'];
  usage: TokenUsage | null;
  durationMs: number;
  courseId?: string | null;
}): void {
  const usage = input.usage ?? { inputTokens: 0, outputTokens: 0, thoughtsTokens: 0 };
  const cost = costOf(usage);
  const row: AiUsageRow = {
    feature: input.feature,
    cache: input.cache,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    thoughts_tokens: usage.thoughtsTokens,
    cost_usd: input.cache === 'miss' ? cost : 0,
    saved_usd: input.cache === 'hit' ? cost : 0,
    duration_ms: input.durationMs,
    course_id: input.courseId ?? null,
    at: nowIso(),
  };
  col('aiUsage')
    .doc(randomUUID())
    .set(row)
    .catch((error) => console.error('AI usage write failed:', error));
}
