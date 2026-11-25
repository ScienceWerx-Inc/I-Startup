import { z } from 'zod';

import { QUESTIONS } from '@/modules/istartup-score/assessment/bank';
import { computeReport, isComplete, type Answers } from '@/modules/istartup-score/assessment/scoring';

/**
 * Shared shape for an iSTARTUP report document in Firestore (`istartup_reports`).
 * Everything the assessment produces is stored — profile, answers,
 * per-dimension scores, final score + band — so the report can be
 * re-rendered later without recomputation.
 */

const QUESTION_IDS = new Set(QUESTIONS.map((q) => q.id));

/**
 * One answer per assessment question, each a whole number 1–5. Unknown question ids are
 * rejected, and so is a partial set: every stored report is a complete assessment.
 */
export const AnswersSchema = z
  .record(z.string(), z.number().int().min(1).max(5))
  .refine((a) => Object.keys(a).every((id) => QUESTION_IDS.has(id)), { message: 'Unknown question id.' })
  .refine((a) => isComplete(a), { message: 'Every question must be answered.' });

/**
 * What the client may send. Scores, final score and band are not part of it: they are
 * computed on the server from `answers` (see `scoreAnswers`), because the Readiness
 * Certificate prints them. Any such fields a client still sends are stripped by zod.
 */
export const ReportPayloadSchema = z.object({
  appId: z.string().min(1).max(120).nullish(),
  startupName: z.string().max(200).default(''),
  profile: z.record(z.string(), z.unknown()).default({}),
  companyInfo: z.unknown().nullish(),
  answers: AnswersSchema,
});

/** The well-formed answers in a stored report (known question, whole number 1–5); the rest are dropped. */
export function storedAnswers(raw: unknown): Answers {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      ([id, v]) => QUESTION_IDS.has(id) && typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5,
    ),
  ) as Answers;
}

/** The stored score fields for a set of answers — the same arithmetic the report screen uses. */
export function scoreAnswers(answers: Answers): {
  scores: Array<{ category: string; score: number }>;
  final_score: number;
  band: string;
} {
  const report = computeReport({ name: '', description: '' }, answers);
  return {
    scores: report.categories.map((c) => ({ category: c.title, score: c.percent })),
    final_score: report.finalScore,
    band: report.band.code,
  };
}

export type ReportPayload = z.infer<typeof ReportPayloadSchema>;

/** Approximate location from IP geolocation headers (country/region/city). */
export const GeoSchema = z.object({
  country: z.string().max(4).nullish(),
  region: z.string().max(120).nullish(),
  city: z.string().max(120).nullish(),
});

export type Geo = z.infer<typeof GeoSchema>;

export interface ReportRow {
  id: string;
  user_id: string | null;
  app_id: string | null;
  startup_name: string;
  profile: unknown;
  company_info: unknown;
  answers: unknown;
  scores: unknown;
  final_score: number;
  band: string;
  country: string | null;
  region: string | null;
  city: string | null;
  created_at: string;
}
