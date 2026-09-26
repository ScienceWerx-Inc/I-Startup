import {
  MAX_SCORE,
  QUESTIONS,
  SECTIONS,
  type CategoryKey,
  type Question,
  type StartupProfile,
} from './bank';

/**
 * Pure scoring: answers in, report out. Nothing here touches the network or the DOM, so
 * the same answers always produce the same report.
 *
 * The arithmetic is the original iSTARTUP formula — each answer earns `value / 5` of its
 * question's points, a section's percentage is earned over available points, and the
 * final score is the weighted sum of section percentages scaled to 500. What changed is
 * that each question now names its own section. The chat version inferred the section
 * from the answer's position in a list, so one unparseable reply shifted every answer
 * after it into the wrong section.
 */

export type Answers = Record<string, number>;

export type Level = 'strong' | 'solid' | 'developing' | 'gap';

export interface CategoryResult {
  key: CategoryKey;
  title: string;
  weight: number;
  /** 0–100. */
  percent: number;
  level: Level;
  /** This section's contribution to the final score, in points out of 500. */
  points: number;
}

export interface Finding {
  question: Question;
  value: number;
}

export interface Band {
  code: 'investment_ready' | 'strong_foundation' | 'emerging' | 'early_stage';
  label: string;
  description: string;
}

export interface IStartupReport {
  profile: StartupProfile;
  answers: Answers;
  finalScore: number;
  band: Band;
  categories: CategoryResult[];
  strengths: Finding[];
  gaps: Finding[];
  generatedAt: string;
}

/** Thresholds carried over from the original report commentary (strictly greater than). */
const BANDS: (Band & { above: number })[] = [
  {
    code: 'investment_ready',
    above: 400,
    label: 'Investment ready',
    description: 'A high degree of investor readiness. This startup is likely to be a strong contender for funding.',
  },
  {
    code: 'strong_foundation',
    above: 300,
    label: 'Strong foundation',
    description: 'A solid foundation with good potential. Targeted improvements would make it highly attractive to investors.',
  },
  {
    code: 'emerging',
    above: 200,
    label: 'Emerging',
    description: 'Real potential, with significant areas to address before it is ready to attract investment.',
  },
  {
    code: 'early_stage',
    above: -1,
    label: 'Early stage',
    description: 'Early in its development. The priorities below are the path to investment readiness.',
  },
];

export const BAND_THRESHOLDS = [200, 300, 400];

export function levelFor(percent: number): Level {
  if (percent >= 80) return 'strong';
  if (percent >= 60) return 'solid';
  if (percent >= 40) return 'developing';
  return 'gap';
}

export const LEVEL_LABEL: Record<Level, string> = {
  strong: 'Strong',
  solid: 'Solid',
  developing: 'Developing',
  gap: 'Gap',
};

export function bandFor(score: number): Band {
  const { code, label, description } = BANDS.find((b) => score > b.above)!;
  return { code, label, description };
}

/** Points out of 500 this question would add if its answer moved to a 5. */
export function recoverablePoints(question: Question, value: number): number {
  const section = SECTIONS.find((s) => s.key === question.category)!;
  const available = QUESTIONS.filter((q) => q.category === question.category).reduce((sum, q) => sum + q.weight, 0);
  return (((5 - value) / 5) * question.weight * section.weight * MAX_SCORE) / available;
}

export function isComplete(answers: Answers): boolean {
  return QUESTIONS.every((q) => answers[q.id] >= 1 && answers[q.id] <= 5);
}

export function computeReport(profile: StartupProfile, answers: Answers, now = new Date()): IStartupReport {
  let finalFraction = 0;

  const categories: CategoryResult[] = SECTIONS.map((section) => {
    const questions = QUESTIONS.filter((q) => q.category === section.key);
    const available = questions.reduce((sum, q) => sum + q.weight, 0);
    const earned = questions.reduce((sum, q) => sum + ((answers[q.id] ?? 0) / 5) * q.weight, 0);
    const fraction = available > 0 ? earned / available : 0;
    finalFraction += fraction * section.weight;
    const percent = Math.round(fraction * 100);
    return {
      key: section.key,
      title: section.title,
      weight: section.weight,
      percent,
      level: levelFor(percent),
      points: Math.round(fraction * section.weight * MAX_SCORE),
    };
  });

  const finalScore = Math.round(finalFraction * MAX_SCORE);

  const findings = QUESTIONS.map((question) => ({ question, value: answers[question.id] ?? 0 }));

  // Strengths: highest answers first, heavier questions breaking ties — a 5 on a
  // 30-point question says more than a 5 on a 15-point one.
  const strengths = findings
    .filter((f) => f.value >= 4)
    .sort((a, b) => b.value - a.value || b.question.weight - a.question.weight)
    .slice(0, 5);

  // Gaps: lowest answers first, then by how many points each is costing.
  const gaps = findings
    .filter((f) => f.value > 0 && f.value <= 2)
    .sort((a, b) => a.value - b.value || recoverablePoints(b.question, b.value) - recoverablePoints(a.question, a.value))
    .slice(0, 5);

  return {
    profile,
    answers,
    finalScore,
    band: bandFor(finalScore),
    categories,
    strengths,
    gaps,
    generatedAt: now.toISOString(),
  };
}

/**
 * The priority actions: every gap's recommended step, and — for a startup with few gaps
 * — the actions behind its middling answers, so a strong startup still gets a next step.
 * Ordered by the points out of 500 each would recover if moved to a 5.
 */
export function priorityActions(report: IStartupReport, limit = 5): Finding[] {
  return QUESTIONS.map((question) => ({ question, value: report.answers[question.id] ?? 0 }))
    .filter((f) => f.value > 0 && f.value <= 3)
    .sort((a, b) => recoverablePoints(b.question, b.value) - recoverablePoints(a.question, a.value))
    .slice(0, limit);
}
