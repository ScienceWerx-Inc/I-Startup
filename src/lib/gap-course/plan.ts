import {
  QUESTIONS,
  sectionOf,
  type CategoryKey,
  type StartupProfile,
} from '@/modules/istartup-score/assessment/bank';
import {
  computeReport,
  recoverablePoints,
  type Answers,
  type IStartupReport,
} from '@/modules/istartup-score/assessment/scoring';

/**
 * Which gaps a founder's course closes. Pure: the same answers always give the same plan,
 * and nothing here calls the model — the AI writes lessons, it never decides what to teach.
 *
 * One module per weak dimension (below 60%, i.e. "developing" or "gap"), weakest first.
 * A founder strong everywhere still gets their two lowest dimensions, so the course
 * always has something to push on.
 */

const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
const questionById = (id: string) => BY_ID.get(id);

export const MAX_MODULES = 4;
const MIN_MODULES = 2;
const WEAK_BELOW = 60;
const MAX_FOCUS_PER_MODULE = 3;

export interface GapFocus {
  questionId: string;
  title: string;
  prompt: string;
  /** 1–5, what they answered. */
  value: number;
  /** The anchor they picked. */
  current: string;
  /** The anchors above it, lowest first — what "better" concretely looks like. */
  better: string[];
  gap: string;
  action: string;
  recoverablePoints: number;
}

export interface GapModule {
  key: CategoryKey;
  title: string;
  summary: string;
  percent: number;
  level: string;
  focus: GapFocus[];
  /** 2 or 3. */
  lessonCount: number;
}

export interface GapPlan {
  startup: StartupProfile;
  finalScore: number;
  band: string;
  modules: GapModule[];
}

export function planFromReport(report: IStartupReport): GapPlan {
  const ranked = [...report.categories].sort((a, b) => a.percent - b.percent);
  const weak = ranked.filter((c) => c.percent < WEAK_BELOW);
  const chosen = (weak.length >= MIN_MODULES ? weak : ranked.slice(0, MIN_MODULES)).slice(0, MAX_MODULES);

  const modules = chosen.map((category): GapModule => {
    const findings = Object.entries(report.answers)
      .map(([id, value]) => ({ question: questionById(id), value }))
      .filter((f): f is { question: NonNullable<ReturnType<typeof questionById>>; value: number } =>
        Boolean(f.question && f.question.category === category.key && f.value > 0),
      )
      .map((f) => ({ ...f, recoverable: recoverablePoints(f.question, f.value) }));

    // Questions they could most improve: answered 3 or below, most recoverable points first.
    // In a dimension with none (a filler module), take the two lowest answers instead.
    const weakAnswers = findings.filter((f) => f.value <= 3).sort((a, b) => b.recoverable - a.recoverable);
    const picked = (weakAnswers.length > 0
      ? weakAnswers
      : [...findings].sort((a, b) => a.value - b.value).slice(0, 2)
    ).slice(0, MAX_FOCUS_PER_MODULE);

    const section = sectionOf(category.key);
    return {
      key: category.key,
      title: category.title,
      summary: section.summary,
      percent: category.percent,
      level: category.level,
      focus: picked.map(({ question, value, recoverable }) => ({
        questionId: question.id,
        title: question.title,
        prompt: question.prompt,
        value,
        current: question.options[value - 1]?.label ?? '',
        better: question.options.filter((o) => o.value > value).map((o) => o.label),
        gap: question.gap,
        action: question.action,
        recoverablePoints: Math.round(recoverable * 10) / 10,
      })),
      lessonCount: Math.min(3, Math.max(2, picked.length)),
    };
  });

  return {
    startup: report.profile,
    finalScore: report.finalScore,
    band: report.band.label,
    modules,
  };
}

/** Rebuilds the plan from a stored report's profile and answers. */
export function planFromAnswers(profile: StartupProfile, answers: Answers): GapPlan {
  return planFromReport(computeReport(profile, answers));
}
