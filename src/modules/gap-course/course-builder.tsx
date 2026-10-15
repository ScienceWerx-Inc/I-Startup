'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Award, Check, GraduationCap, Loader2, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import type { PublicCourseJob } from '@/lib/gap-course/shared';
import { cn } from '@/lib/utils';
import { Panel } from '@/modules/istartup-score/components/chrome';

/**
 * Builds a founder's gap-closing course and shows it happening. The browser drives the
 * server one step at a time — outline, then three lessons at once, then publish — so no
 * request runs long, and closing the tab only pauses it: the next visit resumes from the
 * job stored on the server.
 */

const CONCURRENCY = 3;
const MAX_LESSON_ATTEMPTS = 3;
const POLL_MS = 3000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class StepError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call(init?: { body: unknown }, reportId?: string): Promise<PublicCourseJob | null> {
  const res = await fetch(init ? '/api/course' : `/api/course?reportId=${reportId}`, {
    method: init ? 'POST' : 'GET',
    headers: init ? { 'Content-Type': 'application/json' } : undefined,
    body: init ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new StepError(data.error ?? 'Something went wrong.', res.status);
  return data.job ?? null;
}

async function drive(reportId: string, onJob: (job: PublicCourseJob) => void, alive: () => boolean) {
  const get = () => call(undefined, reportId);
  const post = (body: Record<string, unknown>) => call({ body: { reportId, ...body } });
  const attempts = new Map<string, number>();

  // `start` is idempotent: it returns an existing job, or (re)designs one that is missing,
  // failed, or was left hanging by a crashed request.
  let job = await get();
  if (!job || job.modules.length === 0) job = await post({ op: 'start' });

  while (job && alive()) {
    onJob(job);
    if (job.status === 'ready') return;

    if (job.modules.length === 0) {
      // Another tab is designing it; wait for the outline.
      if (job.status === 'error') throw new StepError(job.error ?? 'We could not design your course.', 500);
      await sleep(POLL_MS);
      job = await post({ op: 'start' });
      continue;
    }

    const lessons = job.modules.flatMap((m) => m.lessons);
    const todo = lessons.filter(
      (l) => l.status === 'pending' || (l.status === 'error' && (attempts.get(l.id) ?? 0) < MAX_LESSON_ATTEMPTS),
    );

    if (todo.length > 0) {
      const queue = [...todo];
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
          for (let next = queue.shift(); next && alive(); next = queue.shift()) {
            attempts.set(next.id, (attempts.get(next.id) ?? 0) + 1);
            try {
              const updated = await post({ op: 'lesson', lessonId: next.id });
              if (updated && alive()) onJob(updated);
            } catch {
              // Recorded on the job as an error lesson; retried on the next pass.
            }
          }
        }),
      );
      job = await get();
      continue;
    }

    if (lessons.some((l) => l.status === 'running') || job.status === 'publishing') {
      await sleep(POLL_MS);
      job = await get();
      continue;
    }
    if (lessons.some((l) => l.status === 'error')) {
      throw new StepError('Some lessons could not be written.', 500);
    }

    try {
      job = await post({ op: 'finish' });
    } catch (error) {
      if (!(error instanceof StepError) || error.status !== 409) throw error;
      await sleep(POLL_MS);
      job = await get();
    }
  }
}

export function useCourseBuilder(reportId: string | null) {
  const [job, setJob] = useState<PublicCourseJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [running, setRunning] = useState(false);
  const alive = useRef(true);

  const run = useCallback(async () => {
    if (!reportId) return;
    setError(null);
    setRunning(true);
    try {
      await drive(reportId, setJob, () => alive.current);
    } catch (err) {
      if (!alive.current) return;
      if (err instanceof StepError && err.status === 402) setLocked(true);
      else setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      if (alive.current) setRunning(false);
    }
  }, [reportId]);

  useEffect(() => {
    alive.current = true;
    run();
    return () => {
      alive.current = false;
    };
  }, [run]);

  return { job, error, locked, running, retry: run };
}

/* ───────────────────────────────────── UI ───────────────────────────────────── */

export function CourseBuilder({ reportId, onReady }: { reportId: string | null; onReady?: () => void }) {
  const { job, error, locked, running, retry } = useCourseBuilder(reportId);
  const router = useRouter();
  const lessons = job?.modules.flatMap((m) => m.lessons) ?? [];
  const written = lessons.filter((l) => l.status === 'done').length;
  const ready = job?.status === 'ready';

  const notified = useRef(false);
  useEffect(() => {
    if (ready && !notified.current) {
      notified.current = true;
      onReady ? onReady() : router.refresh();
    }
  }, [ready, onReady, router]);

  if (locked) return null;

  const stage = !reportId
    ? 'Your course is built from a saved report.'
    : error
      ? error
      : !job || job.status === 'outlining'
        ? 'Designing modules around your weakest dimensions…'
        : job.status === 'writing' && written < lessons.length
          ? `Writing lessons for your startup… ${written} of ${lessons.length}`
          : job.status === 'ready'
            ? 'Ready. Every lesson is written for your startup.'
            : 'Publishing your course…';

  const pct = ready ? 100 : !job?.modules.length ? 8 : 10 + Math.round((written / Math.max(1, lessons.length)) * 85);

  return (
    <Panel className="no-print overflow-hidden p-0 sm:p-0">
      <div className="grid md:grid-cols-[1fr_240px]">
        <div className="p-6 sm:p-8">
          <p className="eyebrow flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> Your gap-closing course
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            {job?.title ?? 'Building a course around your gaps'}
          </h2>
          {job?.subtitle ? <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-mut">{job.subtitle}</p> : null}

          {job?.plan.length ? (
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {job.plan.map((m) => (
                <li key={m.key} className="rounded-lg bg-mist px-3.5 py-2.5">
                  <p className="flex items-center justify-between gap-2 text-sm font-medium text-ink">
                    {m.title}
                    <span className="font-mono text-xs text-risk">{m.percent}%</span>
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-mut">{m.gaps.join(' · ')}</p>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className={cn('flex items-center gap-2', error ? 'text-risk' : 'text-ink')}>
                {error ? (
                  <TriangleAlert className="h-4 w-4" />
                ) : ready ? (
                  <Check className="h-4 w-4 text-good" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                )}
                {stage}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-mist">
              <motion.div
                className={cn('h-full rounded-full', error ? 'bg-risk' : 'bg-brand')}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 60, damping: 18 }}
              />
            </div>
          </div>

          {job?.modules.length && !ready ? (
            <ol className="mt-5 space-y-3">
              {job.modules.map((m, i) => (
                <li key={m.id}>
                  <p className="text-xs font-medium uppercase tracking-wide text-mut">
                    Module {i + 1} · {m.title}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {m.lessons.map((l) => (
                      <li key={l.id} className="flex items-center gap-2 text-sm text-ink">
                        {l.status === 'done' ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-good" />
                        ) : l.status === 'error' ? (
                          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-warn" />
                        ) : (
                          <Loader2 className={cn('h-3.5 w-3.5 shrink-0 text-mut', l.status === 'running' && 'animate-spin text-brand')} />
                        )}
                        <span className={l.status === 'done' ? '' : 'text-mut'}>{l.title}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {ready && job ? (
              <Link href={`/learn/${job.courseId}`} className={buttonVariants({ size: 'lg' })}>
                Start the course <ArrowRight className="h-4 w-4" />
              </Link>
            ) : error ? (
              <Button size="lg" onClick={retry} disabled={running}>
                <RotateCcw className="h-4 w-4" /> Try again
              </Button>
            ) : !reportId ? (
              <Link href="/learn" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
                Go to my courses
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-mut">
                <Sparkles className="h-3.5 w-3.5" /> Takes a minute or two. You can leave; it carries on next time you open My Courses.
              </span>
            )}
          </div>
        </div>

        <div className="print-exact flex flex-col items-center justify-center gap-3 bg-readout p-8 text-center text-readout-ink">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-brand-bright/70 bg-[radial-gradient(circle_at_30%_30%,#123456,#0b1b2b)]">
            <span className="absolute inset-2 rounded-full border border-dashed border-readout-line" aria-hidden />
            <span className="font-mono text-3xl font-semibold tracking-tight">01</span>
            <Award className="absolute -bottom-2 h-6 w-6 rounded-full bg-brand-bright p-1 text-white" aria-hidden />
          </div>
          <p className="mt-1 text-sm font-semibold">01 Certification</p>
          <p className="text-[13px] leading-relaxed text-readout-ink/70">Issued when you complete every lesson.</p>
        </div>
      </div>
    </Panel>
  );
}
