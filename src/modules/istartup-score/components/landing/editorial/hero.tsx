'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { DIMENSION_COUNT, QUESTION_COUNT } from './example';
import { STAGE_ICON } from './icons';
import { EASE, PrimaryCta, SectionIndex, TextLink, wrap } from './shared';

const STAGES = [
  { label: 'Idea', note: 'A problem worth solving, and a hunch about how.' },
  { label: 'Validation', note: 'Evidence that people want it — not just that they like it.' },
  { label: 'Traction', note: 'Usage that keeps growing when you stop pushing.' },
  { label: 'Growth', note: 'A repeatable way to win customers, at a cost that works.' },
  { label: 'Funding', note: 'A story an investor can underwrite — with numbers behind it.' },
];

const DEFAULT_NOTE = 'Five stages. Most founders aren’t sure which one they’re really in.';

/** Where the point settles: past validation, short of traction. Illustrative. */
const SETTLE = 0.41;

const LINES = ['Know where', 'your startup', 'stands'];

export function Hero() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);

  return (
    <section id="assess" aria-labelledby="hero-title" className="relative flex min-h-[100svh] flex-col pt-[68px]">
      <div className={cn(wrap, 'flex flex-1 flex-col pb-10 pt-[clamp(3rem,2rem+5vh,6rem)]')}>
        <SectionIndex index="01" stage="Assess" />

        <h1 id="hero-title" className="ed-mega mt-[clamp(2.5rem,1rem+5vh,4.5rem)] text-ink">
          {LINES.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.06em]">
              <motion.span
                className="block"
                initial={{ y: '105%' }}
                animate={{ y: 0 }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.1 + i * 0.09 }}
              >
                {line}
                {i === LINES.length - 1 && (
                  // The full stop is the point: you, positioned.
                  <motion.span
                    aria-hidden
                    className="ml-[0.05em] inline-block h-[0.17em] w-[0.17em] rounded-full bg-mint align-baseline"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 1.05 }}
                  />
                )}
              </motion.span>
            </span>
          ))}
          <span className="sr-only">.</span>
        </h1>

        <div className="mt-[clamp(2rem,1rem+3vh,3.5rem)] grid grid-cols-12 gap-x-6 gap-y-8">
          <motion.div
            className="col-span-12 md:col-span-7 md:col-start-6 lg:col-span-5 lg:col-start-8"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.6 }}
          >
            <p className="ed-lead max-w-[30rem] text-pretty">
              A clear assessment of where your startup is today — and what needs to happen next.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-2">
              <PrimaryCta id="hero-cta" />
              <TextLink id="hero-how" href="#understand">
                How it works
              </TextLink>
            </div>
          </motion.div>
        </div>

        {/* Position: the startup journey as a single line, and one point looking for its place. */}
        <div className="mt-auto pt-16">
          <div className="relative h-16">
            {/* Ahead of you */}
            <motion.div
              aria-hidden
              className="absolute left-0 right-0 top-1/2 h-px origin-left bg-hair-strong"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.4, ease: EASE, delay: 0.9 }}
            />
            {/* Behind you */}
            <motion.div
              aria-hidden
              className="absolute left-0 top-1/2 h-px bg-ink"
              initial={{ width: '0%' }}
              animate={{ width: ['0%', '58%', `${SETTLE * 100}%`] }}
              transition={{ duration: 2.8, ease: EASE, times: [0, 0.62, 1], delay: 1.5 }}
            />

            {STAGES.map((s, i) => {
              const at = i / (STAGES.length - 1);
              const passed = settled && at <= SETTLE;
              const align = i === 0 ? 'left-0' : i === STAGES.length - 1 ? 'right-0' : '-translate-x-1/2';
              return (
                <div
                  key={s.label}
                  className="absolute top-0 h-full"
                  style={i === STAGES.length - 1 ? { right: 0 } : { left: `${at * 100}%` }}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-1/2 h-[9px] w-px -translate-y-1/2',
                      i === STAGES.length - 1 ? 'right-0' : 'left-0',
                      passed ? 'bg-ink' : 'bg-hair-strong',
                    )}
                  />
                  <button
                    type="button"
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    className={cn(
                      'absolute top-[calc(50%+14px)] inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm text-[13px] font-medium tracking-[-0.01em] transition-colors duration-500',
                      align,
                      hovered === i ? 'text-ink' : passed ? 'text-ink' : 'text-faint',
                    )}
                  >
                    <StageIcon label={s.label} />
                    {s.label}
                  </button>
                </div>
              );
            })}

            {/* The point */}
            <motion.div
              aria-hidden
              className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              initial={{ left: '0%', opacity: 0 }}
              animate={{ left: ['0%', '58%', `${SETTLE * 100}%`], opacity: 1 }}
              transition={{
                left: { duration: 2.8, ease: EASE, times: [0, 0.62, 1], delay: 1.5 },
                opacity: { duration: 0.3, delay: 1.5 },
              }}
              onAnimationComplete={() => setSettled(true)}
            >
              <span
                className="block h-3.5 w-3.5 rounded-full bg-mint"
                style={{ boxShadow: '0 0 0 5px var(--paper)' }}
              />
              <AnimatePresence>
                {settled && (
                  <motion.span
                    className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 whitespace-nowrap text-[13px] font-medium tracking-[-0.01em] text-ink"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EASE }}
                  >
                    You are here?
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="mt-10 flex flex-col justify-between gap-3 border-t border-hair pt-5 sm:flex-row sm:items-baseline">
            <div className="relative h-5 flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={hovered ?? 'default'}
                  className="absolute inset-0 truncate text-[14px] text-mut"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  {hovered === null ? (
                    DEFAULT_NOTE
                  ) : (
                    <>
                      <span className="font-medium text-ink">{STAGES[hovered].label}</span>
                      {' — '}
                      {STAGES[hovered].note}
                    </>
                  )}
                </motion.p>
              </AnimatePresence>
            </div>
            <p className="text-[14px] text-mut">
              {QUESTION_COUNT} questions · {DIMENSION_COUNT} dimensions · 1 honest picture
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The stage's icon, sized to the label (hidden on the narrowest screens, where labels are tight). */
function StageIcon({ label }: { label: string }) {
  const Icon = STAGE_ICON[label];
  return Icon ? <Icon aria-hidden className="hidden h-5 w-5 sm:block" strokeWidth={1.5} /> : null;
}
