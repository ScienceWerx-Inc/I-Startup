import { z } from 'zod';

import { PROFILE_FIELDS, type StartupProfile } from '../assessment/bank';

/**
 * The "Submit an idea" onboarding: a few screens of quick questions asked before the
 * founder creates an account. Everything here is stored on the user row (`onboarding`)
 * for analysis, and the overlapping fields pre-fill the assessment's startup profile —
 * so the sector / stage / team / funding options are the profile's own.
 */

const optionsOf = (key: string) => PROFILE_FIELDS.find((f) => f.key === key)!.options;

export type OnboardingKey =
  | 'startupName'
  | 'pitch'
  | 'sector'
  | 'businessModel'
  | 'stage'
  | 'foundedYear'
  | 'founders'
  | 'role'
  | 'teamSize'
  | 'funding'
  | 'goal'
  | 'country';

export type OnboardingAnswers = Partial<Record<OnboardingKey, string>>;

export type OnboardingField =
  | { key: OnboardingKey; kind: 'chips'; label: string; options: string[]; optional?: boolean }
  | {
      key: OnboardingKey;
      kind: 'text' | 'textarea';
      label: string;
      placeholder: string;
      optional?: boolean;
      autoComplete?: string;
    };

export interface OnboardingStep {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  fields: OnboardingField[];
}

function foundedYearOptions(now = new Date()): string[] {
  const year = now.getFullYear();
  return ['Not incorporated yet', ...Array.from({ length: 5 }, (_, i) => String(year - i)), `Before ${year - 4}`];
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'idea',
    eyebrow: 'Your idea',
    title: 'Tell us what you’re building',
    subtitle: 'The short version is enough. You can refine it later.',
    fields: [
      { key: 'startupName', kind: 'text', label: 'Startup name', placeholder: 'e.g. Helios Materials', autoComplete: 'organization' },
      {
        key: 'pitch',
        kind: 'textarea',
        label: 'What does it do, and for whom?',
        placeholder: 'Two or three sentences: the product, who it is for, and the problem it removes.',
      },
      { key: 'sector', kind: 'chips', label: 'What kind of startup is it?', options: optionsOf('sector') },
    ],
  },
  {
    id: 'company',
    eyebrow: 'The company',
    title: 'Where the company stands',
    subtitle: 'This helps us benchmark you against startups at the same point.',
    fields: [
      {
        key: 'businessModel',
        kind: 'chips',
        label: 'Who pays you?',
        options: ['B2B', 'B2C', 'B2B2C', 'Marketplace', 'Government / public sector', 'Not decided yet'],
      },
      { key: 'stage', kind: 'chips', label: 'Current stage', options: optionsOf('stage') },
      { key: 'foundedYear', kind: 'chips', label: 'When was the company founded?', options: foundedYearOptions() },
    ],
  },
  {
    id: 'team',
    eyebrow: 'The team',
    title: 'Who is behind it',
    subtitle: 'Investors back teams first, so this frames the whole report.',
    fields: [
      { key: 'founders', kind: 'chips', label: 'How many founders?', options: ['Solo founder', '2', '3', '4+'] },
      {
        key: 'role',
        kind: 'chips',
        label: 'Your role',
        options: ['CEO / business', 'CTO / technical', 'Product', 'Scientist / inventor', 'Other'],
      },
      { key: 'teamSize', kind: 'chips', label: 'Full-time team size', options: optionsOf('teamSize') },
    ],
  },
  {
    id: 'goals',
    eyebrow: 'Funding & goals',
    title: 'Where you want to go',
    subtitle: 'Last one before your account.',
    fields: [
      { key: 'funding', kind: 'chips', label: 'Funding to date', options: optionsOf('funding') },
      {
        key: 'goal',
        kind: 'chips',
        label: 'What do you want from iSTARTUP?',
        options: ['Raise investment', 'Win grants', 'Join an accelerator', 'Benchmark my startup', 'Find co-founders'],
      },
      {
        key: 'country',
        kind: 'text',
        label: 'Where is the company based?',
        placeholder: 'Country',
        optional: true,
        autoComplete: 'country-name',
      },
    ],
  },
];

export function isStepComplete(step: OnboardingStep, answers: OnboardingAnswers): boolean {
  return step.fields.every((f) => f.optional || Boolean(answers[f.key]?.trim()));
}

/** Server-side shape: every answer optional, lengths bounded, unknown keys dropped. */
export const OnboardingSchema = z.object({
  startupName: z.string().trim().max(200).optional(),
  pitch: z.string().trim().max(2000).optional(),
  sector: z.string().max(80).optional(),
  businessModel: z.string().max(80).optional(),
  stage: z.string().max(80).optional(),
  foundedYear: z.string().max(40).optional(),
  founders: z.string().max(40).optional(),
  role: z.string().max(80).optional(),
  teamSize: z.string().max(40).optional(),
  funding: z.string().max(80).optional(),
  goal: z.string().max(80).optional(),
  country: z.string().trim().max(120).optional(),
});

/** The assessment profile the onboarding answers pre-fill. */
export function profileFromOnboarding(o: OnboardingAnswers | null | undefined): Partial<StartupProfile> {
  if (!o) return {};
  return {
    name: o.startupName ?? '',
    description: o.pitch ?? '',
    stage: o.stage,
    sector: o.sector,
    teamSize: o.teamSize,
    funding: o.funding,
  };
}
