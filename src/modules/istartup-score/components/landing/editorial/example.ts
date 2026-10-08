import { MAX_SCORE, QUESTIONS, SECTIONS, type CategoryKey } from '../../../assessment/bank';

/**
 * One illustrative startup, followed through the page: its score (03), the gaps that
 * become a plan (04) and the investor questions it can and can't answer yet (05).
 * Dimensions, question count and the 500-point scale come from the real instrument.
 */

export { MAX_SCORE };
export const QUESTION_COUNT = QUESTIONS.length;
export const DIMENSION_COUNT = SECTIONS.length;

export const EXAMPLE_SCORE = 312;

export type Finding = {
  key: CategoryKey;
  name: string;
  /** Distance from the stage benchmark: positive is a strength, negative a gap. */
  delta: number;
  evidence: string;
};

const title = (key: CategoryKey) => SECTIONS.find((s) => s.key === key)!.title;

/** In the instrument's own order. */
export const FINDINGS: Finding[] = [
  { key: 'management', name: title('management'), delta: 16, evidence: 'Founders have built and sold a company before.' },
  { key: 'momentum', name: title('momentum'), delta: 28, evidence: 'Paying customers, growing month on month.' },
  { key: 'business_model', name: title('business_model'), delta: -24, evidence: 'Pricing hasn’t been tested with real buyers.' },
  { key: 'motivation', name: title('motivation'), delta: -13, evidence: 'One co-founder is still part-time.' },
  { key: 'market', name: title('market'), delta: 11, evidence: 'A clear first segment with a costly problem.' },
];

export type Plan = {
  key: CategoryKey;
  gap: string;
  steps: { when: string; what: string; why: string }[];
};

export const PLANS: Plan[] = [
  {
    key: 'business_model',
    gap: 'Pricing hasn’t been tested with real buyers.',
    steps: [
      {
        when: 'This week',
        what: 'Put a real price in front of five target customers.',
        why: 'Not “would you pay?” — an actual number, an actual ask.',
      },
      {
        when: 'This month',
        what: 'Rebuild your unit economics around the price that held.',
        why: 'One customer, fully costed. It’s the first thing an investor will check.',
      },
      {
        when: 'This quarter',
        what: 'Re-assess, and watch the gap close.',
        why: 'Progress you can show beats progress you describe.',
      },
    ],
  },
  {
    key: 'motivation',
    gap: 'One co-founder is still part-time.',
    steps: [
      {
        when: 'This week',
        what: 'Agree a date for full-time commitment — in writing.',
        why: 'Investors back people who have already jumped.',
      },
      {
        when: 'This month',
        what: 'Map what the business needs from each founder for the next year.',
        why: 'Clear roles turn “a team” into “the right team”.',
      },
      {
        when: 'This quarter',
        what: 'Re-assess with the team you’ll actually pitch.',
        why: 'The score should describe the company you’re asking them to fund.',
      },
    ],
  },
];

export type InvestorQuestion = { ask: string; ready: boolean; because: string };

export const INVESTOR_QUESTIONS: InvestorQuestion[] = [
  { ask: 'Why this team?', ready: true, because: 'Built and sold before.' },
  { ask: 'Is anyone paying?', ready: true, because: 'Yes — and growing monthly.' },
  { ask: 'Why this market, why now?', ready: true, because: 'Clear segment, urgent problem.' },
  { ask: 'What is one customer worth?', ready: false, because: 'Pricing untested.' },
  { ask: 'Is everyone all-in?', ready: false, because: 'One co-founder part-time.' },
  { ask: 'What will the money change?', ready: false, because: 'No milestone plan yet.' },
];
