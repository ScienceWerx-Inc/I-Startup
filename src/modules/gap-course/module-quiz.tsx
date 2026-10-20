'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Award, CheckCircle2, ClipboardList, Loader2, RotateCcw, XCircle } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import type { Response } from '@/features/assessment/domain';
import type { ClientQuestion } from '@/features/assessment/server';
import type { QuizFeedback, QuizState } from '@/lib/gap-course/quiz-run';
import { cn } from '@/lib/utils';

import { Answers } from './review-panel';

/**
 * A module's graded quiz. The server owns the questions' order, grading, attempts and the
 * answer keys (which never reach this component); here the founder answers, submits, and
 * reads the result with an explanation for every question. Passing ticks the quiz in the
 * course and can finish it.
 */

type Result = { percent: number; passed: boolean; courseComplete: boolean; feedback: QuizFeedback[] };

async function api<T>(init?: RequestInit, query?: string): Promise<T> {
  const res = await fetch(`/api/course/quiz${query ?? ''}`, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong with this quiz.');
  return body as T;
}

export function ModuleQuiz({
  courseId,
  lessonId,
  nextHref,
  certificateHref,
}: {
  courseId: string;
  lessonId: string;
  nextHref: string;
  certificateHref: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<QuizState | null>(null);
  const [attempt, setAttempt] = useState<{ attemptId: string; questions: ClientQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, Response>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(
    () => api<QuizState>(undefined, `?courseId=${courseId}&lessonId=${lessonId}`),
    [courseId, lessonId],
  );

  // First load; an attempt left open (a reload mid-quiz) is resumed, not restarted.
  useEffect(() => {
    let alive = true;
    fetchState().then(
      (s) => {
        if (!alive) return;
        setState(s);
        if (s.inProgress) setAttempt(s.inProgress);
      },
      (e: unknown) => alive && setError(e instanceof Error ? e.message : 'Could not load the quiz.'),
    );
    return () => {
      alive = false;
    };
  }, [fetchState]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      setAttempt(await api({ method: 'POST', body: JSON.stringify({ op: 'start', courseId, lessonId }) }));
      setAnswers({});
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the quiz.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!attempt) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<Result>({
        method: 'POST',
        body: JSON.stringify({ op: 'submit', courseId, lessonId, attemptId: attempt.attemptId, responses: answers }),
      });
      setResult(r);
      setAttempt(null);
      setState(await fetchState());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit the quiz.');
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return (
      <div className="rounded-card bg-surface p-8 text-sm text-mut">
        {error ?? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the quiz…
          </span>
        )}
      </div>
    );
  }

  const attemptsLeft = Math.max(0, state.maxAttempts - state.attemptsUsed);
  const shown = result ?? (state.last ? { ...state.last, courseComplete: false } : null);

  /* ── Taking it ── */
  if (attempt) {
    const answered = attempt.questions.filter((q) => answers[q.questionId]).length;
    const done = answered === attempt.questions.length;
    return (
      <div className="space-y-4">
        {attempt.questions.map((q, i) => (
          <QuestionCard
            key={q.questionId}
            question={q}
            index={i}
            value={answers[q.questionId]}
            onChange={(r) => setAnswers((a) => ({ ...a, [q.questionId]: r }))}
          />
        ))}
        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface/95 p-4 shadow-sm backdrop-blur">
          <span className="text-sm text-mut">
            {answered} of {attempt.questions.length} answered · {state.passPercent}% to pass
          </span>
          <Button onClick={submit} disabled={!done || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Submit answers
          </Button>
        </div>
        {error ? <p className="text-sm text-risk">{error}</p> : null}
      </div>
    );
  }

  /* ── Before, between and after attempts ── */
  return (
    <div className="space-y-5">
      <div className="rounded-card bg-surface p-6 sm:p-8">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-mut">
          <ClipboardList className="h-3.5 w-3.5" /> Graded quiz
        </p>
        <h2 className="mt-2 text-xl font-semibold text-ink">{state.title}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Questions', String(state.questionCount)],
            ['Pass mark', `${state.passPercent}%`],
            ['Attempts left', `${attemptsLeft} of ${state.maxAttempts}`],
            ['Best score', state.attemptsUsed ? `${state.bestPercent}%` : '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-paper p-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-mut">{label}</p>
              <p className="mt-1 text-lg font-semibold text-ink tabular">{value}</p>
            </div>
          ))}
        </div>

        {state.passed ? (
          <p className="mt-5 flex items-center gap-2 rounded-lg bg-good-soft p-3 text-sm font-medium text-good">
            <CheckCircle2 className="h-4 w-4" /> Passed with {state.bestPercent}%. This module is complete.
          </p>
        ) : attemptsLeft === 0 ? (
          <p className="mt-5 rounded-lg bg-warn-soft p-3 text-sm text-ink">
            You have used every attempt. Your best was {state.bestPercent}%; review the module&apos;s lessons, and contact
            support if you need another attempt.
          </p>
        ) : (
          <p className="mt-5 text-sm leading-relaxed text-mut">
            Answer every question, then submit. You see which you got right, with an explanation, after you submit.
            Passing this quiz is required for the 411 Certificate.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {!state.passed && attemptsLeft > 0 ? (
            <Button onClick={start} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : state.attemptsUsed ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {state.attemptsUsed ? 'Try again' : 'Start the quiz'}
            </Button>
          ) : null}
          {state.passed ? (
            result?.courseComplete ? (
              <Link href={certificateHref} className={buttonVariants()}>
                <Award className="h-4 w-4" /> View your 411 Certificate
              </Link>
            ) : (
              <Link href={nextHref} className={buttonVariants()}>
                Continue <ArrowRight className="h-4 w-4" />
              </Link>
            )
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm text-risk">{error}</p> : null}
      </div>

      {shown ? <QuizReview percent={shown.percent} passed={shown.passed} feedback={shown.feedback} passPercent={state.passPercent} /> : null}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  value,
  onChange,
}: {
  question: ClientQuestion;
  index: number;
  value: Response | undefined;
  onChange: (r: Response) => void;
}) {
  const p = question.payload;
  const options =
    p.kind === 'mcq_single' || p.kind === 'mcq_multi'
      ? p.options
      : p.kind === 'true_false'
        ? [
            { id: 'true', label: 'True' },
            { id: 'false', label: 'False' },
          ]
        : [];
  const selected = (id: string) =>
    value?.kind === 'mcq_single'
      ? value.optionId === id
      : value?.kind === 'mcq_multi'
        ? value.optionIds.includes(id)
        : value?.kind === 'true_false'
          ? String(value.value) === id
          : false;
  const pick = (id: string) => {
    if (p.kind === 'true_false') onChange({ kind: 'true_false', value: id === 'true' });
    else if (p.kind === 'mcq_single') onChange({ kind: 'mcq_single', optionId: id });
    else if (p.kind === 'mcq_multi') {
      const current = value?.kind === 'mcq_multi' ? value.optionIds : [];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      // An empty selection is no answer at all.
      if (next.length) onChange({ kind: 'mcq_multi', optionIds: next });
    }
  };

  return (
    <fieldset className="rounded-card bg-surface p-5 sm:p-6">
      <legend className="sr-only">Question {index + 1}</legend>
      <p className="text-[15px] font-medium leading-relaxed text-ink">
        <span className="mr-2 font-mono text-xs text-mut">{String(index + 1).padStart(2, '0')}</span>
        {question.stem}
      </p>
      {p.kind === 'mcq_multi' ? <p className="mt-1 text-xs text-mut">Select every answer that applies.</p> : null}
      <div className="mt-3 space-y-2" role={p.kind === 'mcq_multi' ? 'group' : 'radiogroup'}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role={p.kind === 'mcq_multi' ? 'checkbox' : 'radio'}
            aria-checked={selected(o.id)}
            onClick={() => pick(o.id)}
            className={cn(
              'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
              selected(o.id) ? 'border-tech bg-tech-soft text-ink' : 'border-line text-ink hover:border-tech/50 hover:bg-paper',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border',
                p.kind === 'mcq_multi' ? 'rounded-[4px]' : 'rounded-full',
                selected(o.id) ? 'border-tech bg-tech' : 'border-line-strong',
              )}
              aria-hidden
            >
              {selected(o.id) ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
            </span>
            <span className="flex-1">{o.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function QuizReview({
  percent,
  passed,
  feedback,
  passPercent,
}: {
  percent: number;
  passed: boolean;
  feedback: QuizFeedback[];
  passPercent: number;
}) {
  return (
    <div className="rounded-card bg-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink">Your last attempt</h3>
        <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', passed ? 'bg-good-soft text-good' : 'bg-risk-soft text-risk')}>
          {percent}% · {passed ? 'Passed' : `Not passed (needs ${passPercent}%)`}
        </span>
      </div>
      <ol className="mt-5 space-y-4">
        {feedback.map((f, i) => (
          <li key={f.questionId} className="border-b border-line pb-4 last:border-0 last:pb-0">
            <p className="flex items-start gap-2 text-sm font-medium text-ink">
              {f.correct ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" aria-label="Right" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-risk" aria-label="Wrong" />
              )}
              <span>
                <span className="mr-1.5 font-mono text-xs text-mut">{String(i + 1).padStart(2, '0')}</span>
                {f.stem}
              </span>
            </p>
            {f.answered.length ? (
              <div className="mt-1 pl-6 text-xs text-mut">
                <Answers label="You answered" items={f.answered} />
              </div>
            ) : null}
            {!f.correct && f.correctAnswer?.length ? (
              <div className="mt-1 pl-6 text-xs font-medium text-good">
                <Answers label={f.correctAnswer.length > 1 ? 'Right answers' : 'Right answer'} items={f.correctAnswer} />
              </div>
            ) : null}
            {f.explanation ? <p className="mt-1.5 pl-6 text-sm leading-relaxed text-ink">{f.explanation}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
