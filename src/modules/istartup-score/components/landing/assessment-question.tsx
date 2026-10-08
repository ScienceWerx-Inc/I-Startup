'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { EASE_OUT } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { DEMO_QUESTION, MAX_SCORE, demoPoints } from './data';
import { ProgressBar } from './progress-bar';
import { btnArrow, btnPrimary } from './ui';

const LEVELS = DEMO_QUESTION.options.length;

/**
 * One anchored question as a working panel: pick an answer and the level meter and points
 * update, with a small "+/- pts" pop for the change. Illustrative — nothing is stored;
 * "Next" starts the real assessment.
 */
export function AssessmentQuestion({ className }: { className?: string }) {
  const [selected, setSelected] = useState(DEMO_QUESTION.defaultIndex);
  const [change, setChange] = useState<{ key: number; delta: number } | null>(null);
  const name = useId();
  const changeCount = useRef(0);

  const points = demoPoints(selected + 1);
  const progress = (DEMO_QUESTION.index / DEMO_QUESTION.total) * 100;

  const choose = (i: number) => {
    if (i === selected) return;
    changeCount.current += 1;
    setChange({ key: changeCount.current, delta: demoPoints(i + 1) - points });
    setSelected(i);
  };

  return (
    <div className={cn('rounded-panel bg-surface-2 p-5 sm:p-8', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-fund-soft px-3 py-1 font-mono text-xs tracking-[-0.03em] text-fg">{DEMO_QUESTION.section}</span>
        <span className="font-mono text-xs tracking-[-0.03em] text-fg-muted tabular">
          Question {DEMO_QUESTION.index} of {DEMO_QUESTION.total}
        </span>
      </div>
      <ProgressBar percent={progress} className="mt-4 h-1 bg-edge" />

      <fieldset className="mt-6">
        <legend className="text-xl font-medium leading-[1.25] tracking-[-0.02em] text-fg sm:text-[22px]">{DEMO_QUESTION.prompt}</legend>
        <div className="mt-5 grid gap-2">
          {DEMO_QUESTION.options.map((label, i) => {
            const isSelected = i === selected;
            return (
              <label
                key={label}
                className={cn(
                  'relative flex cursor-pointer items-center gap-3.5 rounded-tile bg-surface px-4 py-3.5 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-fg',
                  !isSelected && 'hover:bg-surface/60',
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId={`${name}-selected`}
                    className="absolute inset-0 rounded-tile bg-fg"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <input type="radio" name={name} checked={isSelected} onChange={() => choose(i)} className="sr-only" />
                <span
                  aria-hidden
                  className={cn(
                    'relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
                    isSelected ? 'border-fund bg-fund' : 'border-edge-strong bg-surface',
                  )}
                >
                  <AnimatePresence>
                    {isSelected && (
                      <motion.span
                        className="h-1.5 w-1.5 rounded-full bg-fg"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.15 }}
                      />
                    )}
                  </AnimatePresence>
                </span>
                <span className={cn('relative text-[15px] leading-snug', isSelected ? 'font-medium text-on-dark' : 'text-fg')}>{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-card bg-surface p-4">
        <div>
          <p className="font-mono text-xs tracking-[-0.03em] text-fg-muted">Score impact</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex gap-1" aria-hidden>
              {Array.from({ length: LEVELS }, (_, i) => (
                <span key={i} className="relative h-1.5 w-7 overflow-hidden rounded-full bg-surface-2">
                  <motion.span
                    className="absolute inset-0 origin-left rounded-full bg-fg"
                    initial={false}
                    animate={{ scaleX: i <= selected ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.03 }}
                  />
                </span>
              ))}
            </span>
            <span className="relative text-sm font-semibold text-fg tabular">
              +{points} pts
              <AnimatePresence>
                {change && (
                  <motion.span
                    key={change.key}
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute -top-1 left-full ml-2 whitespace-nowrap rounded-full px-1.5 text-xs font-semibold',
                      change.delta > 0 ? 'bg-fund-soft text-fg' : 'text-fg-muted',
                    )}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: [0, 1, 1, 0], y: -10 }}
                    transition={{ duration: 1.1, ease: EASE_OUT }}
                    onAnimationComplete={() => setChange(null)}
                  >
                    {change.delta > 0 ? '+' : '−'}
                    {Math.abs(change.delta)}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </div>
          <p className="sr-only" aria-live="polite">
            This answer is worth {points} points out of {MAX_SCORE}.
          </p>
        </div>
        <Link href="/interview" className={btnPrimary('sm')} aria-label="Next: start the full assessment">
          Next <ArrowRight className={btnArrow} />
        </Link>
      </div>
    </div>
  );
}
