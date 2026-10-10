'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAccount } from '@/hooks/use-account';
import { cn } from '@/lib/utils';

import { assessmentDraftKey } from '../assessment/draft-key';
import { Chip, Eyebrow, Panel, SiteHeader } from '../components/chrome';
import {
  ONBOARDING_STEPS,
  isStepComplete,
  type OnboardingAnswers,
  type OnboardingField,
} from '../onboarding/fields';

/**
 * "Submit an idea" — the only way in. A few screens of quick questions (sliding between
 * screens), then account creation, then a short celebration before the assessment.
 * A signed-in founder gets the same questions without the account step: submitting a new
 * idea replaces their onboarding answers and starts a fresh assessment.
 *
 * Answers survive a reload via sessionStorage (a convenience; the flow works without it).
 */

const SESSION_KEY = 'istartup-onboarding-v1';
const CELEBRATE_MS = 2600;

const inputClass =
  'w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-mut/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

function readSaved(): OnboardingAnswers {
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? '{}') as OnboardingAnswers;
  } catch {
    return {};
  }
}

function save(answers: OnboardingAnswers | null) {
  try {
    if (answers) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(answers));
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked — the flow still works, it just won't survive a reload.
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useAccount();
  const reduceMotion = useReducedMotion();

  // Read during the first client render. Safe for hydration: nothing that depends on the
  // answers renders until the account has loaded (the server render is the spinner).
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => (typeof window === 'undefined' ? {} : readSaved()));
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [celebrating, setCelebrating] = useState<string | null>(null);

  useEffect(() => {
    if (!celebrating) save(answers);
  }, [answers, celebrating]);

  // Signed-in founders skip the account step.
  const totalSteps = ONBOARDING_STEPS.length + (user ? 0 : 1);
  const isAccountStep = !user && stepIndex === ONBOARDING_STEPS.length;
  const step = ONBOARDING_STEPS[stepIndex];
  const canContinue = isAccountStep ? true : step ? isStepComplete(step, answers) : false;

  const go = useCallback(
    (to: number) => {
      setDirection(to > stepIndex ? 1 : -1);
      setStepIndex(Math.max(0, Math.min(totalSteps - 1, to)));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [stepIndex, totalSteps],
  );

  /** Account created (or onboarding saved): clear stale drafts, celebrate, then go. */
  const finish = useCallback(
    (userId: string, name: string) => {
      save(null);
      try {
        window.localStorage.removeItem(assessmentDraftKey(userId));
      } catch {
        // Nothing to clear.
      }
      setCelebrating(name);
      window.setTimeout(() => router.push('/interview'), CELEBRATE_MS);
    },
    [router],
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const next = async () => {
    if (!canContinue) return;
    if (stepIndex < ONBOARDING_STEPS.length - 1 || (!user && stepIndex === ONBOARDING_STEPS.length - 1)) {
      go(stepIndex + 1);
      return;
    }
    // Last question screen for a signed-in founder: save and continue.
    if (user) {
      setSaving(true);
      setSaveError(null);
      try {
        const res = await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ onboarding: answers }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not save your answers.');
        finish(user.id, user.fullName);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Could not save your answers.');
      } finally {
        setSaving(false);
      }
    }
  };

  // Enter advances (outside textareas), so the whole flow works from the keyboard.
  useEffect(() => {
    if (isAccountStep || celebrating) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== 'Enter' || t?.tagName === 'TEXTAREA' || t?.tagName === 'BUTTON') return;
      e.preventDefault();
      void next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const slide: Variants = useMemo(() => {
    const dx = reduceMotion ? 0 : 56;
    return {
      enter: (dir: number) => ({ x: dir * dx, opacity: 0, filter: reduceMotion ? 'none' : 'blur(6px)' }),
      center: {
        x: 0,
        opacity: 1,
        filter: 'blur(0px)',
        transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1], staggerChildren: reduceMotion ? 0 : 0.07, delayChildren: 0.08 },
      },
      exit: (dir: number) => ({
        x: dir * -dx,
        opacity: 0,
        filter: reduceMotion ? 'none' : 'blur(6px)',
        transition: { duration: 0.24, ease: 'easeIn' },
      }),
    };
  }, [reduceMotion]);

  const item: Variants = {
    enter: { opacity: 0, y: reduceMotion ? 0 : 14 },
    center: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  };

  if (celebrating !== null) return <Celebration name={celebrating} onContinue={() => router.push('/interview')} />;

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader
        right={
          user ? null : (
            <span className="text-sm text-mut">
              Have an account?{' '}
              <Link href="/sign-in" className="font-medium text-brand hover:underline">
                Sign in
              </Link>
            </span>
          )
        }
      />

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <StepTrack total={totalSteps} current={stepIndex} />

          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
            </div>
          ) : (
            <div className="relative mt-6 overflow-hidden px-1 pb-2">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={isAccountStep ? 'account' : step.id}
                  custom={direction}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  {isAccountStep ? (
                    <AccountStep
                      answers={answers}
                      item={item}
                      onBack={() => go(stepIndex - 1)}
                      onCreated={(u) => finish(u.id, u.fullName)}
                    />
                  ) : (
                    <Panel>
                      <motion.div variants={item}>
                        <Eyebrow>
                          Step {stepIndex + 1} of {totalSteps} · {step.eyebrow}
                        </Eyebrow>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{step.title}</h1>
                        <p className="mt-1.5 text-sm text-mut">{step.subtitle}</p>
                      </motion.div>

                      <div className="mt-7 space-y-6">
                        {step.fields.map((field, i) => (
                          <motion.div key={field.key} variants={item}>
                            <FieldInput
                              field={field}
                              value={answers[field.key] ?? ''}
                              autoFocus={i === 0}
                              onChange={(v) => setAnswers((a) => ({ ...a, [field.key]: v }))}
                            />
                          </motion.div>
                        ))}
                      </div>

                      {saveError ? (
                        <p className="mt-6 rounded-lg border border-risk/30 bg-risk-soft p-3.5 text-sm text-risk">{saveError}</p>
                      ) : null}

                      <motion.div variants={item} className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
                        {stepIndex > 0 ? (
                          <Button variant="ghost" size="sm" onClick={() => go(stepIndex - 1)}>
                            <ArrowLeft className="h-3.5 w-3.5" /> Back
                          </Button>
                        ) : (
                          <Link href="/" className="text-sm text-mut hover:text-ink">
                            Cancel
                          </Link>
                        )}
                        <Button onClick={() => void next()} disabled={!canContinue || saving}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {user && stepIndex === ONBOARDING_STEPS.length - 1 ? 'Start my assessment' : 'Next'}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    </Panel>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">{isLoading ? null : <IdeaCard answers={answers} />}</div>
        </aside>
      </div>
    </div>
  );
}

/* ─────────────────────────────── Pieces ─────────────────────────────── */

function StepTrack({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full rounded-full bg-brand"
            initial={false}
            animate={{ width: i < current ? '100%' : i === current ? '45%' : '0%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      ))}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  autoFocus,
}: {
  field: OnboardingField;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const label = (
    <span className="mb-2 flex items-center gap-1.5 text-[15px] font-medium text-ink">
      {field.label}
      {field.optional ? <span className="text-xs font-normal text-mut">Optional</span> : null}
    </span>
  );

  if (field.kind === 'chips') {
    return (
      <div>
        {label}
        <div className="flex flex-wrap gap-2">
          {field.options.map((option) => (
            <Chip key={option} selected={value === option} onClick={() => onChange(option)}>
              {option}
            </Chip>
          ))}
        </div>
      </div>
    );
  }

  return (
    <label className="block">
      {label}
      {field.kind === 'textarea' ? (
        <textarea
          className={cn(inputClass, 'min-h-[96px] resize-y leading-relaxed')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          autoFocus={autoFocus}
          maxLength={2000}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          autoFocus={autoFocus}
          maxLength={200}
        />
      )}
    </label>
  );
}

function AccountStep({
  answers,
  item,
  onBack,
  onCreated,
}: {
  answers: OnboardingAnswers;
  item: Variants;
  onBack: () => void;
  onCreated: (user: { id: string; fullName: string }) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; emailTaken?: boolean } | null>(null);

  const ready = fullName.trim() && /\S+@\S+\.\S+/.test(email) && password.length >= 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, onboarding: answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ message: data.error ?? 'Could not create your account.', emailTaken: data.code === 'email_taken' });
        return;
      }
      onCreated(data.user);
    } catch {
      setError({ message: 'Could not reach the server. Check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <motion.div variants={item}>
        <Eyebrow>Last step · Your account</Eyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
          Save {answers.startupName ? <span className="text-brand">{answers.startupName}</span> : 'your idea'} and get your score
        </h1>
        <p className="mt-1.5 text-sm text-mut">
          Your account keeps your answers, your score and your report together.
        </p>
      </motion.div>

      <form onSubmit={submit} className="mt-7 space-y-5">
        <motion.label variants={item} className="block">
          <span className="mb-1.5 block text-[15px] font-medium text-ink">Your name</span>
          <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" autoFocus maxLength={120} />
        </motion.label>
        <motion.label variants={item} className="block">
          <span className="mb-1.5 block text-[15px] font-medium text-ink">Email</span>
          <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={254} />
        </motion.label>
        <motion.label variants={item} className="block">
          <span className="mb-1.5 block text-[15px] font-medium text-ink">Password</span>
          <span className="relative block">
            <input
              type={showPassword ? 'text' : 'password'}
              className={cn(inputClass, 'pr-11')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={200}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-mut hover:text-ink"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
          <span className="mt-1.5 block text-xs text-mut">At least 8 characters.</span>
        </motion.label>

        {error ? (
          <p className="rounded-lg border border-risk/30 bg-risk-soft p-3.5 text-sm text-risk">
            {error.message}{' '}
            {error.emailTaken ? (
              <Link href="/sign-in?next=/start" className="font-semibold underline underline-offset-2">
                Sign in
              </Link>
            ) : null}
          </p>
        ) : null}

        <motion.div variants={item} className="flex items-center justify-between gap-3 border-t border-line pt-5">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <Button type="submit" disabled={!ready || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Create account &amp; start
          </Button>
        </motion.div>
      </form>
    </Panel>
  );
}

const CARD_ROWS: { key: keyof OnboardingAnswers; label: string }[] = [
  { key: 'sector', label: 'Kind' },
  { key: 'businessModel', label: 'Model' },
  { key: 'stage', label: 'Stage' },
  { key: 'foundedYear', label: 'Founded' },
  { key: 'founders', label: 'Founders' },
  { key: 'teamSize', label: 'Team' },
  { key: 'funding', label: 'Funding' },
  { key: 'goal', label: 'Goal' },
];

/** A live preview of the idea, filling in as the founder answers. */
function IdeaCard({ answers }: { answers: OnboardingAnswers }) {
  return (
    <div className="rounded-xl bg-readout p-6 text-readout-ink shadow-[0_24px_60px_-24px_rgba(11,27,43,0.45)]">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-readout-mut">Your idea</p>
      <motion.h2 layout className="mt-2 truncate text-xl font-semibold tracking-tight">
        {answers.startupName?.trim() || <span className="text-readout-mut">Untitled startup</span>}
      </motion.h2>
      <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-[13px] leading-relaxed text-readout-ink/75">
        {answers.pitch?.trim() || 'What it does, and for whom, will show here.'}
      </p>
      <dl className="mt-5 space-y-2.5 border-t border-readout-line pt-4 font-mono text-xs">
        {CARD_ROWS.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3">
            <dt className="text-readout-mut">{row.label}</dt>
            <dd className="min-w-0 truncate text-right">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={answers[row.key] ?? 'empty'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className={cn('inline-block', answers[row.key] ? 'text-readout-ink' : 'text-readout-line')}
                >
                  {answers[row.key] || '—'}
                </motion.span>
              </AnimatePresence>
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex items-center justify-between rounded-lg border border-readout-line px-3.5 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-readout-mut">iSTARTUP Score</span>
        <span className="font-mono text-sm text-readout-mut">
          <span className="text-readout-ink">???</span> / 500
        </span>
      </div>
    </div>
  );
}

/** The hand-off: the score gauge draws itself, then the assessment opens. */
function Celebration({ name, onContinue }: { name: string; onContinue: () => void }) {
  const first = name.split(' ')[0];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen flex-col items-center justify-center bg-readout px-6 text-center text-readout-ink"
    >
      <motion.svg
        viewBox="96 160 320 200"
        className="h-28 w-44"
        aria-hidden
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 16 }}
      >
        <path d="M121 312A135 135 0 0 1 391 312" fill="none" stroke="#22364b" strokeWidth="30" strokeLinecap="round" />
        <motion.path
          d="M121 312A135 135 0 0 1 391 312"
          fill="none"
          stroke="var(--brand-bright)"
          strokeWidth="30"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
        <motion.line
          x1="256"
          y1="312"
          x2="256"
          y2="200"
          stroke="#fff"
          strokeWidth="12"
          strokeLinecap="round"
          style={{ transformBox: 'view-box', transformOrigin: '256px 312px' }}
          initial={{ rotate: -90 }}
          animate={{ rotate: 62 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
        <circle cx="256" cy="312" r="20" fill="#fff" />
      </motion.svg>

      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 1.1 }}
        className="-mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-bright"
      >
        <Check className="h-5 w-5 text-white" strokeWidth={3} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.25, duration: 0.4 }}
        className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl"
      >
        {first ? `Welcome aboard, ${first}.` : 'Your idea is in.'}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.4 }}
        className="mt-3 max-w-md text-[15px] leading-relaxed text-readout-ink/75"
      >
        Next: 25 questions across five dimensions. About ten minutes to your iSTARTUP Score.
      </motion.p>
      <motion.button
        type="button"
        onClick={onContinue}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.7 }}
        className="mt-8 inline-flex h-10 items-center gap-2 rounded-md bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-brand-soft"
      >
        Start the assessment <ArrowRight className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );
}
