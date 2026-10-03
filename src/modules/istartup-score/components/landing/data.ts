import { Box, ChartNoAxesCombined, Globe, UsersRound, Zap, type LucideIcon } from 'lucide-react';

import { MAX_SCORE, QUESTIONS, SECTIONS, type CategoryKey } from '../../assessment/bank';

/**
 * Landing-page content. Everything here is the illustrative example profile shown on
 * the marketing page — labelled as an example wherever it appears.
 */

export { MAX_SCORE };

export const SAMPLE_SCORE = 352;
export const SAMPLE_BAND = 'Strong foundation';

export type Dimension = {
  key: CategoryKey;
  title: string;
  description: string;
  percent: number;
  /** Share of the final score, from the real scoring model. */
  weight: number;
  color: string;
  icon: LucideIcon;
};

const weightOf = (key: CategoryKey) => SECTIONS.find((s) => s.key === key)!.weight;

export const DIMENSIONS: Dimension[] = [
  {
    key: 'management',
    title: 'Management',
    description: 'Team capability, structure and clarity of execution.',
    percent: 68,
    weight: weightOf('management'),
    color: 'var(--dim-management)',
    icon: UsersRound,
  },
  {
    key: 'momentum',
    title: 'Momentum',
    description: 'Traction, revenue growth and market adoption.',
    percent: 72,
    weight: weightOf('momentum'),
    color: 'var(--dim-momentum)',
    icon: ChartNoAxesCombined,
  },
  {
    key: 'business_model',
    title: 'Business Model',
    description: 'Unit economics, scalability and revenue model.',
    percent: 60,
    weight: weightOf('business_model'),
    color: 'var(--dim-business-model)',
    icon: Box,
  },
  {
    key: 'market',
    title: 'Market',
    description: 'Market size, competitive landscape and timing.',
    percent: 70,
    weight: weightOf('market'),
    color: 'var(--dim-market)',
    icon: Globe,
  },
  {
    key: 'motivation',
    title: 'Motivation',
    description: 'Founders’ drive, commitment and long-term vision.',
    percent: 55,
    weight: weightOf('motivation'),
    color: 'var(--dim-motivation)',
    icon: Zap,
  },
];

/** Example score history for the hero's "Score over time" chart. */
export const SCORE_HISTORY = [
  { label: 'Jan', value: 268 },
  { label: 'Feb', value: 281 },
  { label: 'Mar', value: 297 },
  { label: 'Apr', value: 305 },
  { label: 'May', value: 314 },
  { label: 'Jun', value: SAMPLE_SCORE },
];

const last = SCORE_HISTORY[SCORE_HISTORY.length - 1].value;
const prev = SCORE_HISTORY[SCORE_HISTORY.length - 2].value;
export const SCORE_GROWTH = Math.round(((last - prev) / prev) * 100);

/** The illustrative assessment question in "How it works". */
const traction = QUESTIONS.find((q) => q.id === 'T1')!;
const momentum = SECTIONS.find((s) => s.key === 'momentum')!;

export const DEMO_QUESTION = {
  section: momentum.title,
  index: 6,
  total: QUESTIONS.length,
  prompt: 'What is your current customer traction?',
  options: [
    'No users or customers yet.',
    'Pilot or early users only.',
    'A small and growing customer base.',
    'Recurring revenue from a growing customer base.',
    'Strong recurring revenue with low churn and expanding accounts.',
  ],
  defaultIndex: 2,
};

/**
 * Points out of MAX_SCORE an answer at `level` (1–5) earns on the traction question,
 * using the scorer's arithmetic: value/5 of the question's points, scaled by the
 * section's weight.
 */
export const demoPoints = (level: number) =>
  Math.round(((traction.weight * level) / 5) * momentum.weight * (MAX_SCORE / 100));

export type RoadmapStep = {
  title: string;
  dimension: CategoryKey;
  detail: string;
  impact: number;
};

export const ROADMAP: RoadmapStep[] = [
  {
    title: 'Strengthen go-to-market strategy',
    dimension: 'market',
    detail:
      'Name your first segment, the channel that reaches it, and what one customer costs to win. Investors fund a repeatable path to buyers, not a broad market.',
    impact: 14,
  },
  {
    title: 'Validate unit economics',
    dimension: 'business_model',
    detail:
      'Show the margin on a single customer after delivery costs, and how it improves with scale. Even early estimates beat an untested revenue model.',
    impact: 12,
  },
  {
    title: 'Show consistent revenue growth',
    dimension: 'momentum',
    detail:
      'Track three core metrics monthly and report them in a short investor update. Six months of steady numbers is the strongest traction signal at seed.',
    impact: 15,
  },
  {
    title: 'Prepare investor-ready materials',
    dimension: 'management',
    detail:
      'A milestone-based use of funds, a 24-month plan with owners and dates, and a deck that answers the gaps above before they are asked.',
    impact: 9,
  },
];

export const dimensionOf = (key: CategoryKey) => DIMENSIONS.find((d) => d.key === key)!;

/** In-page sections, shared by the navbar and footer. */
export const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#framework', label: 'Framework' },
  { href: '#roadmap', label: 'Roadmap' },
  { href: '#use-cases', label: 'Use cases' },
];
