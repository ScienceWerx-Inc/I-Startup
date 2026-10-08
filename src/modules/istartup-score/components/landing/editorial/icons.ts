import {
  Banknote,
  Box,
  Calculator,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  FlaskConical,
  Globe,
  HeartHandshake,
  Landmark,
  Lightbulb,
  ListChecks,
  Milestone,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  Users,
  UsersRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import type { CategoryKey } from '../../../assessment/bank';

/** One icon per scored dimension, used wherever a dimension is named. */
export const DIMENSION_ICON: Record<CategoryKey, LucideIcon> = {
  management: UsersRound,
  momentum: ChartNoAxesCombined,
  business_model: Box,
  motivation: Zap,
  market: Globe,
};

/** The startup journey on the hero line. */
export const STAGE_ICON: Record<string, LucideIcon> = {
  Idea: Lightbulb,
  Validation: FlaskConical,
  Traction: Users,
  Growth: TrendingUp,
  Funding: Landmark,
};

/** What the report gives you beyond the number (section 02). */
export const REPORT_ICON: Record<string, LucideIcon> = {
  Strengths: ShieldCheck,
  Gaps: TriangleAlert,
  Insights: Lightbulb,
  Recommendations: ListChecks,
  'Funding readiness': Landmark,
};

/** Plan horizons (section 04). */
export const WHEN_ICON: Record<string, LucideIcon> = {
  'This week': CalendarCheck,
  'This month': CalendarDays,
  'This quarter': CalendarRange,
};

/** The investor questions (section 05). */
export const QUESTION_ICON: Record<string, LucideIcon> = {
  'Why this team?': Users,
  'Is anyone paying?': Banknote,
  'Why this market, why now?': Globe,
  'What is one customer worth?': Calculator,
  'Is everyone all-in?': HeartHandshake,
  'What will the money change?': Milestone,
};
