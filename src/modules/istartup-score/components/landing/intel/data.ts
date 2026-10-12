import { MAX_SCORE, QUESTIONS, SECTIONS, type CategoryKey } from '../../../assessment/bank';
import {
  BAND_THRESHOLDS,
  bandFor,
  computeReport,
  priorityActions,
  recoverablePoints,
  type Answers,
  type Level,
} from '../../../assessment/scoring';

/**
 * Everything the landing page shows comes from the real instrument. The only invented
 * thing is the example startup's answers: they are run through the same scoring the
 * assessment uses, so the score, the levels, the band and the priority actions on the
 * page are exactly what the product would report for those answers. Every place the
 * example appears is labelled as illustrative.
 */

export { MAX_SCORE };
export type { CategoryKey, Level };

export const QUESTION_COUNT = QUESTIONS.length;
export const DIMENSION_COUNT = SECTIONS.length;
export const ILLUSTRATIVE = 'Illustrative example';

const SAMPLE_ANSWERS: Answers = {
  M1: 4, M2: 4, M3: 3, M4: 3, M5: 4,
  T1: 4, T2: 5, T3: 4, T4: 3, T5: 4,
  B1: 2, B2: 2, B3: 3, B4: 3, B5: 2,
  V1: 4, V2: 3, V3: 3, V4: 2, V5: 3,
  K1: 4, K2: 4, K3: 4, K4: 3, K5: 3,
};

// A fixed date keeps the report pure, so server and client render the same thing.
const REPORT = computeReport(
  { name: 'Example startup', description: '', stage: 'Early revenue' },
  SAMPLE_ANSWERS,
  new Date('2026-01-01T00:00:00Z'),
);

export type Dimension = {
  key: CategoryKey;
  title: string;
  summary: string;
  /** Share of the final score, 0–1. */
  weight: number;
  /** The example startup's result, 0–100. */
  percent: number;
  level: Level;
};

export const DIMENSIONS: Dimension[] = REPORT.categories.map((c) => ({
  key: c.key,
  title: c.title,
  summary: SECTIONS.find((s) => s.key === c.key)!.summary,
  weight: c.weight,
  percent: c.percent,
  level: c.level,
}));

export const SAMPLE_SCORE = REPORT.finalScore;
export const SAMPLE_BAND = REPORT.band.label;

export type Action = {
  id: string;
  dimension: string;
  dimensionKey: CategoryKey;
  title: string;
  gap: string;
  action: string;
  /** Points out of 500 this would recover if the answer moved to the top anchor. */
  points: number;
};

export const SAMPLE_ACTIONS: Action[] = priorityActions(REPORT, 3).map((f) => ({
  id: f.question.id,
  dimension: SECTIONS.find((s) => s.key === f.question.category)!.title,
  dimensionKey: f.question.category,
  title: f.question.title,
  gap: f.question.gap,
  action: f.question.action,
  points: Math.round(recoverablePoints(f.question, f.value)),
}));

export const FOCUS_ACTION = SAMPLE_ACTIONS[0];

/** The four readiness bands, lowest first, by their real thresholds. */
export const BAND_LABELS = [0, ...BAND_THRESHOLDS.map((t) => t + 1)].map((score) => bandFor(score).label);

/** Two more illustrative applicants for the funder view, scored the same way. */
const answersFrom = (values: number[]): Answers =>
  Object.fromEntries(QUESTIONS.map((q, i) => [q.id, values[i % values.length]]));
export const OTHER_APPLICANTS = [
  [3, 3, 2, 4, 3, 3, 2, 3],
  [2, 3, 2, 2, 3, 3, 2],
].map((values) =>
  computeReport({ name: '', description: '' }, answersFrom(values), new Date('2026-01-01T00:00:00Z')).categories.map(
    (c) => c.percent,
  ),
);

/** Mint for strong and solid results, amber for anything needing attention. */
export const toneFor = (level: Level): 'mint' | 'amber' => (level === 'strong' || level === 'solid' ? 'mint' : 'amber');
