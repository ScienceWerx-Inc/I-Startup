'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ClipboardCheck } from 'lucide-react';

import { EASE_OUT } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { DEMO_QUESTION, MAX_SCORE, demoPoints } from './data';
import { ProgressBar } from './progress-bar';
import { btnArrow, btnPrimary, card } from './ui';

const LEVELS = DEMO_QUESTION.options.length;

/**
 * One anchored question as a working card: pick an answer and the level meter and points
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
    <div className={cn(card, 'shadow-float p-5 sm:p-7', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-soft text-blue">
            <ClipboardCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <span className="rounded-md bg-lavender px-2 py-1 text-xs font-semibold text-fg">{DEMO_QUESTION.section}</span>
        </div>
        <span className="text-xs font-medium text-fg-muted tabular">
          Question {DEMO_QUESTION.index} of {DEMO_QUESTION.total}
        </span>
      </div>
      <ProgressBar percent={progress} className="mt-4 h-1" />

      <fieldset className="mt-6">
        <legend className="text-xl font-bold tracking-[-0.02em] text-fg sm:text-2xl">{DEMO_QUESTION.prompt}</legend>
        <div className="mt-5 grid gap-2">
          {DEMO_QUESTION.options.map((label, i) => {
            const isSelected = i === selected;
            return (
              <label
                key={label}
                className={cn(
                  'relative flex cursor-pointer items-center gap-3.5 rounded-tile border px-4 py-3.5 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-blue',
                  isSelected ? 'border-transparent' : 'border-edge hover:border-edge-strong hover:bg-surface-2/60',
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId={`${name}-selected`}
                    className="absolute inset-0 rounded-tile border border-blue bg-blue-soft"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <input type="radio" name={name} checked={isSelected} onChange={() => choose(i)} className="sr-only" />
                <span
                  aria-hidden
                  className={cn(
                    'relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
                    isSelected ? 'border-blue bg-blue' : 'border-edge-strong bg-surface',
                  )}
                >
                  <AnimatePresence>
                    {isSelected && (
                      <motion.span
                        className="h-1.5 w-1.5 rounded-full bg-surface"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ duration: 0.15 }}
                      />
                    )}
                  </AnimatePresence>
                </span>
                <span className={cn('relative text-[15px] leading-snug', isSelected ? 'font-medium text-fg' : 'text-fg/80')}>{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-card bg-surface-2 p-4">
        <div>
          <p className="text-xs font-medium text-fg-muted">Score impact</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex gap-1" aria-hidden>
              {Array.from({ length: LEVELS }, (_, i) => (
                <span key={i} className="relative h-1.5 w-7 overflow-hidden rounded-full bg-edge">
                  <motion.span
                    className="absolute inset-0 origin-left rounded-full bg-blue-gradient"
                    initial={false}
                    animate={{ scaleX: i <= selected ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: EASE_OUT, delay: i * 0.03 }}
                  />
                </span>
              ))}
            </span>
            <span className="relative text-sm font-bold text-fg tabular">
              +{points} pts
              <AnimatePresence>
                {change && (
                  <motion.span
                    key={change.key}
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute -top-1 left-full ml-2 whitespace-nowrap text-xs font-semibold',
                      change.delta > 0 ? 'text-blue' : 'text-fg-muted',
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
