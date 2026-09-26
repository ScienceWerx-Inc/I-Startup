'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, ListChecks, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  PROFILE_FIELDS,
  QUESTIONS,
  SECTIONS,
  questionsIn,
  sectionOf,
  type CategoryKey,
  type StartupProfile,
} from '../assessment/bank';
import { computeReport, isComplete, type Answers, type IStartupReport } from '../assessment/scoring';
import { Chip, Eyebrow, Panel } from './chrome';
import { ReportView } from './report-view';

/**
 * Drives the whole iSTARTUP assessment, replacing the old chat interview with the
 * FounderFit shape: intro → profile → (section brief → one question per screen) × 5 →
 * review → report.
 *
 * Unlike FounderFit's candidate assessment this is a self-assessment, not a proctored
 * measurement, so nothing is one-way: Back always works, the progress track jumps to any
 * question, and the review screen is where unanswered questions are named. The draft is
 * kept in localStorage so a founder can close the tab and resume — a convenience only;
 * the page works identically when storage is unavailable.
 */

type Step = 'intro' | 'profile' | 'section' | 'question' | 'review' | 'report';

interface Draft {
  v: 1;
  step: Step;
  index: number;
  profile: StartupProfile;
  answers: Answers;
  seen: CategoryKey[];
  report: IStartupReport | null;
}

const STORAGE_KEY = 'istartup-assessment-v1';
const TRANSITION = { duration: 0.18, ease: 'easeOut' as const };
const AUTO_ADVANCE_MS = 260;

function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    return parsed?.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function writeDraft(draft: Draft | null) {
  try {
    if (draft) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked or full — resuming is a convenience, so carry on without it.
  }
}

export interface AssessmentShellProps {
  /** Pre-fills the profile, e.g. from a linked application. */
  initialProfile?: Partial<StartupProfile>;
  /** Called once when a report is generated — e.g. to archive it. */
  onComplete?: (report: IStartupReport) => void;
}

export function AssessmentShell({ initialProfile, onComplete }: AssessmentShellProps) {
  const blankProfile = useMemo<StartupProfile>(
    () => ({ name: initialProfile?.name ?? '', description: initialProfile?.description ?? '', ...initialProfile }),
    [initialProfile],
  );

  // Client-only component (see interview.tsx), so storage can be read during the first
  // render rather than in an effect — no flash of the intro before a saved report appears.
  const [boot] = useState<Draft | null>(() => (typeof window === 'undefined' ? null : readDraft()));
  const bootReport = boot?.report ?? null;

  const [step, setStep] = useState<Step>(bootReport ? 'report' : 'intro');
  const [index, setIndex] = useState(0);
  const [profile, setProfile] = useState<StartupProfile>(bootReport ? boot!.profile : blankProfile);
  const [answers, setAnswers] = useState<Answers>(bootReport ? boot!.answers : {});
  const [seen, setSeen] = useState<CategoryKey[]>(bootReport ? boot!.seen : []);
  const [report, setReport] = useState<IStartupReport | null>(bootReport);
  const [resumable, setResumable] = useState<Draft | null>(() =>
    boot && !bootReport && (Object.keys(boot.answers).length > 0 || boot.step !== 'intro') ? boot : null,
  );

  /** Set when a question is opened from the review screen, so answering returns there. */
  const returnToReview = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (step === 'intro' && !report) return;
    writeDraft({ v: 1, step, index, profile, answers, seen, report });
  }, [step, index, profile, answers, seen, report]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step, index]);

  const clearAdvance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };

  /** Opens question `i`, showing its section's brief first if this is the founder's first visit. */
  const openQuestion = useCallback(
    (i: number, fromReview = false) => {
      clearAdvance();
      returnToReview.current = fromReview;
      const target = Math.max(0, Math.min(QUESTIONS.length - 1, i));
      setIndex(target);
      const category = QUESTIONS[target].category;
      if (!fromReview && !seen.includes(category)) setStep('section');
      else setStep('question');
    },
    [seen],
  );

  const next = useCallback(() => {
    clearAdvance();
    if (returnToReview.current || index >= QUESTIONS.length - 1) {
      returnToReview.current = false;
      setStep('review');
      return;
    }
    openQuestion(index + 1);
  }, [index, openQuestion]);

  const back = useCallback(() => {
    clearAdvance();
    returnToReview.current = false;
    if (index === 0) setStep('profile');
    else {
      setIndex(index - 1);
      setStep('question');
    }
  }, [index]);

  const answer = useCallback(
    (value: number) => {
      const id = QUESTIONS[index].id;
      setAnswers((a) => ({ ...a, [id]: value }));
      clearAdvance();
      advanceTimer.current = setTimeout(next, AUTO_ADVANCE_MS);
    },
    [index, next],
  );

  useEffect(() => clearAdvance, []);

  // Keyboard: 1–5 answer, ←/→ navigate. Ignored while typing in a field.
  useEffect(() => {
    if (step !== 'question') return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const digit = Number(e.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= 5) {
        e.preventDefault();
        answer(digit);
      } else if (e.key === 'ArrowLeft') {
        back();
      } else if (e.key === 'ArrowRight' && answers[QUESTIONS[index].id]) {
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, index, answers, answer, back, next]);

  const resume = () => {
    if (!resumable) return;
    setProfile(resumable.profile);
    setAnswers(resumable.answers);
    setSeen(resumable.seen);
    setIndex(resumable.index);
    setStep(resumable.step === 'intro' ? 'profile' : resumable.step);
    setResumable(null);
  };

  const restart = () => {
    clearAdvance();
    writeDraft(null);
    setProfile(blankProfile);
    setAnswers({});
    setSeen([]);
    setIndex(0);
    setReport(null);
    setResumable(null);
    setStep('intro');
  };

  const submit = () => {
    if (!isComplete(answers)) return;
    const result = computeReport(profile, answers);
    setReport(result);
    setStep('report');
    onComplete?.(result);
  };

  const answeredCount = QUESTIONS.filter((q) => answers[q.id]).length;

  if (step === 'report' && report) {
    return (
      <ReportView
        report={report}
        onEdit={() => {
          setReport(null);
          setStep('review');
        }}
        onRestart={restart}
      />
    );
  }

  const screenKey = step === 'question' || step === 'section' ? `${step}-${index}` : step;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      {step === 'question' || step === 'review' ? (
        <ProgressTrack
          index={step === 'review' ? -1 : index}
          answers={answers}
          answeredCount={answeredCount}
          onJump={(i) => openQuestion(i, step === 'review')}
          onReview={() => {
            clearAdvance();
            setStep('review');
          }}
          onReviewStep={step === 'review'}
        />
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={screenKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={TRANSITION}
        >
          {step === 'intro' ? (
            <IntroScreen
              resumable={resumable}
              onBegin={() => {
                setResumable(null);
                setStep('profile');
              }}
              onResume={resume}
              onDiscard={restart}
            />
          ) : null}

          {step === 'profile' ? (
            <ProfileScreen
              profile={profile}
              onChange={setProfile}
              onBack={() => setStep('intro')}
              onContinue={() => openQuestion(answeredCount > 0 ? index : 0)}
            />
          ) : null}

          {step === 'section' ? (
            <SectionBrief
              category={QUESTIONS[index].category}
              onContinue={() => {
                const category = QUESTIONS[index].category;
                setSeen((s) => (s.includes(category) ? s : [...s, category]));
                setStep('question');
              }}
            />
          ) : null}

          {step === 'question' ? (
            <QuestionScreen index={index} value={answers[QUESTIONS[index].id]} onAnswer={answer} onBack={back} onNext={next} />
          ) : null}

          {step === 'review' ? (
            <ReviewScreen answers={answers} onEdit={(i) => openQuestion(i, true)} onSubmit={submit} />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────── Screens ─────────────────────────────── */

function IntroScreen({
  resumable,
  onBegin,
  onResume,
  onDiscard,
}: {
  resumable: Draft | null;
  onBegin: () => void;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const resumeCount = resumable ? Object.keys(resumable.answers).length : 0;
  return (
    <div>
      <Eyebrow>Startup readiness benchmark</Eyebrow>
      <h1 className="mt-3.5 max-w-2xl text-3xl font-bold leading-[1.15] tracking-tight text-ink sm:text-[40px]">
        Not <em className="not-italic text-brand">“is this a good idea?”</em>
        <br />
        but <em className="not-italic text-brand">“is this startup ready to fund?”</em>
      </h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-mut">
        The iSTARTUP Score evaluates your venture the way an investor or grant reviewer would — across five
        weighted dimensions. Each question offers five concrete descriptions; choose the one that matches where
        your startup is <strong className="font-semibold text-ink">today</strong>, not where you plan to be. The
        result is a score out of 500, a breakdown by dimension, and a prioritised list of what to fix first.
      </p>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-mut">
        <span className="inline-flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" /> 25 questions · 5 sections</span>
        <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> About 10 minutes</span>
        <span className="inline-flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Progress saved on this device</span>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Panel key={s.key} className="p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-xs font-semibold text-ink">
                {String(s.ordinal).padStart(2, '0')} · {s.title}
              </p>
              <p className="font-mono text-[11px] text-mut tabular">{Math.round(s.weight * 100)}%</p>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-mut">{s.summary}</p>
          </Panel>
        ))}
      </div>

      {resumable ? (
        <Panel className="mt-8 flex flex-col gap-4 border-brand/30 bg-brand-soft/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-ink">You have an assessment in progress</p>
            <p className="mt-0.5 text-sm text-mut">
              {resumable.profile.name ? `${resumable.profile.name} · ` : ''}
              {resumeCount} of {QUESTIONS.length} questions answered
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onDiscard}>Start over</Button>
            <Button onClick={onResume}>
              Resume <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Panel>
      ) : (
        <Button size="lg" className="mt-9" onClick={onBegin}>
          Begin assessment <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function ProfileScreen({
  profile,
  onChange,
  onBack,
  onContinue,
}: {
  profile: StartupProfile;
  onChange: (p: StartupProfile) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const fieldsDone = PROFILE_FIELDS.filter((f) => profile[f.key]).length;
  const total = PROFILE_FIELDS.length + 2;
  const done = fieldsDone + (profile.name.trim() ? 1 : 0) + (profile.description.trim() ? 1 : 0);
  const ready = done === total;

  const inputClass =
    'w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-mut/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

  return (
    <Panel>
      <Eyebrow>Step 1 of 3 · Startup profile · {done}/{total}</Eyebrow>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-ink">About your startup</h2>
      <p className="mt-1 text-sm text-mut">
        This frames your report and is not scored. You can change any of it before you submit.
      </p>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-[15px] font-medium text-ink">Startup name</span>
          <input
            className={inputClass}
            value={profile.name}
            onChange={(e) => onChange({ ...profile, name: e.target.value })}
            placeholder="e.g. Helios Materials"
            autoComplete="organization"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[15px] font-medium text-ink">What does it do, and what problem does it solve?</span>
          <textarea
            className={cn(inputClass, 'min-h-[104px] resize-y leading-relaxed')}
            value={profile.description}
            onChange={(e) => onChange({ ...profile, description: e.target.value })}
            placeholder="Two or three sentences: the product, who it is for, and the problem it removes."
          />
        </label>

        {PROFILE_FIELDS.map((field) => (
          <div key={field.key} className="border-t border-line pt-5">
            <p className="mb-2.5 flex items-center gap-1.5 text-[15px] font-medium text-ink">
              <CheckCircle2 aria-hidden className={cn('h-4 w-4 shrink-0', profile[field.key] ? 'text-brand' : 'text-line-strong')} />
              {field.label}
            </p>
            <div className="flex flex-wrap gap-2 pl-[22px]">
              {field.options.map((option) => (
                <Chip
                  key={option}
                  selected={profile[field.key] === option}
                  onClick={() => onChange({ ...profile, [field.key]: option })}
                >
                  {option}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <Button disabled={!ready} onClick={onContinue}>
          Continue<span className="hidden sm:inline"> to Section 1 — Management</span> <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Panel>
  );
}

function SectionBrief({ category, onContinue }: { category: CategoryKey; onContinue: () => void }) {
  const section = sectionOf(category);
  const count = questionsIn(category).length;
  return (
    <div className="print-exact rounded-xl bg-readout p-6 text-readout-ink sm:p-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-readout-mut">
        Section {section.ordinal} of {SECTIONS.length} · {Math.round(section.weight * 100)}% of your score
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{section.title}</h2>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-readout-ink/80">{section.intro}</p>

      <div className="mt-6 flex gap-1.5" aria-hidden>
        {SECTIONS.map((s) => (
          <div
            key={s.key}
            className={cn('h-1 flex-1 rounded-full', s.ordinal < section.ordinal ? 'bg-brand-bright' : s.ordinal === section.ordinal ? 'bg-readout-ink' : 'bg-readout-line')}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="font-mono text-xs text-readout-mut">{count} questions · about 2 minutes</p>
        <button
          type="button"
          onClick={onContinue}
          autoFocus
          className="inline-flex h-10 items-center gap-2 rounded-md bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright"
        >
          Start this section <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function QuestionScreen({
  index,
  value,
  onAnswer,
  onBack,
  onNext,
}: {
  index: number;
  value: number | undefined;
  onAnswer: (v: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const question = QUESTIONS[index];
  const section = sectionOf(question.category);
  const inSection = questionsIn(question.category);
  const position = inSection.findIndex((q) => q.id === question.id) + 1;

  return (
    <Panel>
      <Eyebrow>
        Section {section.ordinal} / {section.title} · Q {String(position).padStart(2, '0')} of {inSection.length}
      </Eyebrow>
      <h2 className="mt-4 text-xl font-medium leading-snug text-ink sm:text-[22px]">{question.prompt}</h2>

      <div role="radiogroup" aria-label={question.prompt} className="mt-6 space-y-2.5">
        {question.options.map((option) => {
          const selected = value === option.value;
          return (
            <motion.button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              whileTap={{ scale: 0.99 }}
              onClick={() => onAnswer(option.value)}
              className={cn(
                'flex w-full items-start gap-3.5 rounded-lg border p-4 text-left text-[15px] leading-relaxed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                selected
                  ? 'border-brand bg-brand-soft text-ink ring-1 ring-brand/30'
                  : 'border-line text-ink hover:border-brand/50 hover:bg-brand-soft/40',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold',
                  selected ? 'border-brand bg-brand text-white' : 'border-line-strong text-mut',
                )}
              >
                {selected ? <Check className="h-3.5 w-3.5" /> : option.value}
              </span>
              <span className="min-w-0 flex-1">{option.label}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <p className="hidden font-mono text-[11px] text-mut sm:block">Press 1–5 to answer · ← → to move</p>
        <Button variant={value ? 'default' : 'ghost'} size="sm" onClick={onNext}>
          {value ? (index === QUESTIONS.length - 1 ? 'Review answers' : 'Next') : 'Skip for now'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Panel>
  );
}

function ReviewScreen({
  answers,
  onEdit,
  onSubmit,
}: {
  answers: Answers;
  onEdit: (index: number) => void;
  onSubmit: () => void;
}) {
  const missing = QUESTIONS.filter((q) => !answers[q.id]);
  return (
    <div className="space-y-5">
      <div>
        <Eyebrow>Step 3 of 3 · Review</Eyebrow>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Review your answers</h2>
        <p className="mt-1 text-sm text-mut">Select any answer to change it. Your score is calculated when you submit.</p>
      </div>

      {missing.length > 0 ? (
        <p className="flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn-soft p-3.5 text-sm text-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <span>
            {missing.length} {missing.length === 1 ? 'question is' : 'questions are'} still unanswered.{' '}
            <button type="button" className="font-semibold text-warn underline underline-offset-2" onClick={() => onEdit(QUESTIONS.indexOf(missing[0]))}>
              Go to the first one
            </button>
          </span>
        </p>
      ) : null}

      {SECTIONS.map((section) => (
        <Panel key={section.key} className="p-0 sm:p-0">
          <div className="flex items-baseline justify-between border-b border-line px-5 py-3.5 sm:px-6">
            <p className="font-mono text-xs font-semibold text-ink">
              {String(section.ordinal).padStart(2, '0')} · {section.title}
            </p>
            <p className="font-mono text-[11px] text-mut">{Math.round(section.weight * 100)}% weight</p>
          </div>
          <ul className="divide-y divide-line">
            {questionsIn(section.key).map((q) => {
              const value = answers[q.id];
              const label = q.options.find((o) => o.value === value)?.label;
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(QUESTIONS.indexOf(q))}
                    className="group flex w-full items-start gap-4 px-5 py-3.5 text-left transition-colors hover:bg-paper focus-visible:bg-paper focus-visible:outline-none sm:px-6"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold',
                        value ? 'bg-brand-soft text-brand' : 'border border-dashed border-warn/60 text-warn',
                      )}
                    >
                      {value ?? '–'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{q.title}</span>
                      <span className={cn('mt-0.5 block text-sm', value ? 'text-mut' : 'text-warn')}>
                        {label ?? 'Not answered'}
                      </span>
                    </span>
                    <span className="mt-0.5 text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      Edit
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}

      <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-ink">{missing.length ? 'Answer every question to see your score' : 'Ready to calculate your score'}</p>
          <p className="mt-0.5 text-sm text-mut">You can come back and edit your answers after seeing the report.</p>
        </div>
        <Button size="lg" disabled={missing.length > 0} onClick={onSubmit}>
          Generate my iSTARTUP report <ArrowRight className="h-4 w-4" />
        </Button>
      </Panel>
    </div>
  );
}

/**
 * The progress track IS the navigation — one clickable segment per question, grouped by
 * section. Filled = answered, ring = where you are.
 */
function ProgressTrack({
  index,
  answers,
  answeredCount,
  onJump,
  onReview,
  onReviewStep,
}: {
  index: number;
  answers: Answers;
  answeredCount: number;
  onJump: (i: number) => void;
  onReview: () => void;
  onReviewStep: boolean;
}) {
  const current = index >= 0 ? QUESTIONS[index] : null;
  return (
    <div className="no-print sticky top-14 z-20 -mx-4 mb-6 bg-paper/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex items-center justify-between gap-3 text-xs text-mut">
        <span className="font-mono font-medium text-ink">
          {current ? `Question ${index + 1} of ${QUESTIONS.length}` : 'Review'}
          {current ? <span className="ml-2 font-sans font-normal text-mut">{current.title}</span> : null}
        </span>
        <span className="font-mono tabular">
          {answeredCount} of {QUESTIONS.length} answered
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2.5" role="group" aria-label="Questions">
        {SECTIONS.map((section) => (
          <div key={section.key} className="flex flex-1 gap-[3px]" title={section.title}>
            {questionsIn(section.key).map((q) => {
              const i = QUESTIONS.indexOf(q);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onJump(i)}
                  aria-label={`Question ${i + 1}, ${q.title}${answers[q.id] ? ' — answered' : ' — not answered'}`}
                  aria-current={i === index ? 'step' : undefined}
                  title={`${section.title} · ${q.title}`}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    answers[q.id] ? 'bg-brand' : 'bg-line-strong/70',
                    i === index && 'ring-2 ring-brand/40 ring-offset-1 ring-offset-paper',
                  )}
                />
              );
            })}
          </div>
        ))}
        <button
          type="button"
          onClick={onReview}
          aria-label="Review all answers"
          aria-current={onReviewStep ? 'step' : undefined}
          title="Review"
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
            answeredCount === QUESTIONS.length ? 'border-brand bg-brand text-white' : 'border-line-strong text-mut',
            onReviewStep && 'ring-2 ring-brand/40 ring-offset-1 ring-offset-paper',
          )}
        >
          <Check className="h-2.5 w-2.5" />
        </button>
      </div>
      <div className="mt-1.5 hidden gap-2.5 sm:flex" aria-hidden>
        {SECTIONS.map((s) => (
          <span key={s.key} className={cn('flex-1 font-mono text-[10px] uppercase tracking-wider', current?.category === s.key ? 'text-ink' : 'text-mut/70')}>
            {s.title}
          </span>
        ))}
        <span className="w-4" />
      </div>
    </div>
  );
}
