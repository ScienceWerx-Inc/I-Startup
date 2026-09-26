import { z } from 'zod';

/**
 * Shared shape for an iSTARTUP report row in Vercel Postgres.
 * Everything the assessment produces is stored — profile, answers,
 * per-dimension scores, final score + band — so the report can be
 * re-rendered later without recomputation.
 */

export const ReportPayloadSchema = z.object({
  appId: z.string().min(1).max(120).nullish(),
  startupName: z.string().max(200).default(''),
  profile: z.record(z.string(), z.unknown()).default({}),
  companyInfo: z.unknown().nullish(),
  answers: z.record(z.string(), z.number().min(1).max(5)),
  scores: z
    .array(z.object({ category: z.string(), score: z.number() }))
    .default([]),
  finalScore: z.number().int().min(0).max(500),
  band: z.string().min(1).max(60),
});

export type ReportPayload = z.infer<typeof ReportPayloadSchema>;

export interface ReportRow {
  id: string;
  app_id: string | null;
  startup_name: string;
  profile: unknown;
  company_info: unknown;
  answers: unknown;
  scores: unknown;
  final_score: number;
  band: string;
  created_at: string;
}
