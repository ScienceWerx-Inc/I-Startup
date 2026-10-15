'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { LessonCheckpoint } from '@/features/lms/domain';
import { cn } from '@/lib/utils';

/** The ungraded "did that land?" question. Its answer is not secret: it never counts. */
export function Checkpoint({ checkpoint }: { checkpoint: LessonCheckpoint }) {
  const [picked, setPicked] = useState<string | null>(null);
  const right = picked ? checkpoint.correctOptionIds.includes(picked) : false;

  return (
    <div className="rounded-card bg-surface p-6 sm:p-8">
      <p className="eyebrow">Check yourself</p>
      <p className="mt-2 text-[16px] font-medium leading-relaxed text-ink">{checkpoint.stem}</p>
      <ul className="mt-4 space-y-2">
        {checkpoint.options.map((o) => {
          const isRight = checkpoint.correctOptionIds.includes(o.id);
          const shown = picked !== null;
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={shown}
                onClick={() => setPicked(o.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                  !shown && 'border-line hover:border-brand hover:bg-brand-soft',
                  shown && isRight && 'border-good/40 bg-good-soft',
                  shown && !isRight && picked === o.id && 'border-risk/40 bg-risk-soft',
                  shown && !isRight && picked !== o.id && 'border-line opacity-60',
                )}
              >
                <span className="font-mono text-xs uppercase text-mut">{o.id}</span>
                <span className="flex-1 text-ink">{o.label}</span>
                {shown && isRight ? <CheckCircle2 className="h-4 w-4 shrink-0 text-good" /> : null}
                {shown && !isRight && picked === o.id ? <XCircle className="h-4 w-4 shrink-0 text-risk" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {picked ? (
        <p className={cn('mt-4 text-sm leading-relaxed', right ? 'text-ink' : 'text-ink')}>
          <strong className={right ? 'text-good' : 'text-risk'}>{right ? 'Right. ' : 'Not quite. '}</strong>
          {checkpoint.explanation}
        </p>
      ) : null}
    </div>
  );
}

/** Marks the lesson complete through the lms brick, then moves on. */
export function CompleteLesson({
  courseId,
  lessonId,
  done,
  nextHref,
}: {
  courseId: string;
  lessonId: string;
  done: boolean;
  nextHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/course/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, lessonId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not save your progress.');
      router.push(data.complete ? `/learn/${courseId}/certificate` : nextHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your progress.');
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {done ? (
        <>
          <span className="flex items-center gap-1.5 text-sm text-good">
            <Check className="h-4 w-4" /> Completed
          </span>
          <Button size="lg" variant="outline" onClick={() => router.push(nextHref)}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <Button size="lg" onClick={complete} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Mark complete and continue
        </Button>
      )}
      {error ? <span className="text-sm text-risk">{error}</span> : null}
    </div>
  );
}

export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      Print or save as PDF
    </Button>
  );
}
