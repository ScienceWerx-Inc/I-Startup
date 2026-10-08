'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';

import { cn } from '@/lib/utils';
import { useMediaQuery } from '../use-media-query';
import { EXAMPLE_SCORE, FINDINGS, MAX_SCORE, type Finding } from './example';
import { DIMENSION_ICON } from './icons';
import { EASE, IconTile, SectionIndex, wrap } from './shared';

/**
 * SCORE → STRENGTHS → GAPS, driven by scroll.
 *
 * It opens on the single number every founder expects. As you scroll, that number
 * resolves into its five dimensions: the ones above the stage benchmark rise in mint,
 * then the ones below drop in amber. On small screens and with reduced motion, the
 * finished picture is shown without pinning.
 */

const PHASES = [
  { label: 'Score', caption: 'One number. Useful — but it flattens everything into a single line.' },
  { label: 'Strengths', caption: 'Above the line: what’s carrying the score, and why.' },
  { label: 'Gaps', caption: 'Below the line: what’s holding it back, ranked by how much.' },
];

const STRENGTH_IN: [number, number] = [0.36, 0.56];
const GAP_IN: [number, number] = [0.69, 0.88];
const MAX_DELTA = 30;

export function Working() {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useMediaQuery('(min-width: 1024px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)');

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useMotionValue(1);
  const [phase, setPhase] = useState(2);

  // Unpinned (small screens, reduced motion) shows the finished picture; pinned follows scroll.
  useEffect(() => {
    p.set(pinned ? scrollYProgress.get() : 1);
  }, [pinned, p, scrollYProgress]);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (pinned) p.set(v);
  });

  // The phase is derived from progress, in a subscription rather than inside the effect.
  useMotionValueEvent(p, 'change', (v) => setPhase(phaseOf(v)));

  return (
    <section
      id="working"
      ref={ref}
      aria-labelledby="working-title"
      className="relative scroll-mt-16"
      style={{ height: pinned ? '320vh' : undefined }}
    >
      <div className={cn(pinned ? 'sticky top-0 flex h-[100svh] flex-col pt-[68px]' : 'ed-y')}>
        <div className={cn(wrap, 'flex flex-1 flex-col justify-center', pinned && 'py-8')}>
          <SectionIndex index="03" stage="Understand" />

          <div className="mt-12 grid grid-cols-12 gap-x-6 gap-y-14 lg:mt-14">
            {/* Left: the statement and where we are in it */}
            <div className="col-span-12 flex flex-col lg:col-span-4">
              <h2 id="working-title" className="font-headline text-[clamp(2.25rem,1.4rem+2.6vw,3.75rem)] font-medium leading-[0.98] tracking-[-0.04em] text-balance">
                See what’s working.{' '}
                <span className={cn('transition-colors duration-700', phase === 2 ? 'text-ink' : 'text-faint')}>
                  See what’s not.
                </span>
              </h2>

              <ol className="relative mt-12 grid gap-5 pl-7" aria-label="Assessment stages">
                <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-hair-strong" />
                <motion.span
                  aria-hidden
                  className="absolute left-0 h-[11px] w-[11px] rounded-full bg-mint"
                  style={{ boxShadow: '0 0 0 4px var(--paper)' }}
                  animate={{ top: `calc(${phase} * 2.5rem + 4.5px)` }}
                  transition={{ duration: 0.6, ease: EASE }}
                />
                {PHASES.map((ph, i) => (
                  <li
                    key={ph.label}
                    aria-current={phase === i ? 'step' : undefined}
                    className={cn(
                      'font-headline h-5 text-[1.25rem] leading-5 tracking-[-0.02em] transition-colors duration-500',
                      phase === i ? 'text-ink' : phase > i ? 'text-mut' : 'text-faint',
                    )}
                  >
                    {ph.label}
                  </li>
                ))}
              </ol>

              <div className="relative mt-10 min-h-[3.5rem] max-w-[22rem]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={phase}
                    className="text-[15px] leading-relaxed text-mut"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    {PHASES[phase].caption}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* Right: the picture */}
            <div className="col-span-12 lg:col-span-8">
              <Chart p={p} />
              <Evidence phase={phase} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const phaseOf = (v: number) => (v < STRENGTH_IN[0] - 0.04 ? 0 : v < GAP_IN[0] - 0.04 ? 1 : 2);

function Chart({ p }: { p: MotionValue<number> }) {
  const scoreOpacity = useTransform(p, [0.22, 0.34], [1, 0]);
  const scoreScale = useTransform(p, [0.22, 0.34], [1, 0.94]);
  const miniOpacity = useTransform(p, [0.3, 0.4], [0, 1]);

  return (
    <div className="relative">
      <div className="relative h-[clamp(240px,34vh,340px)]">
        {/* The stage benchmark */}
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-ink" />
        <span className="absolute left-0 top-[calc(50%-1.5rem)] text-[12px] text-faint">Stage benchmark</span>

        {/* The single number, before it resolves */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-[calc(50%+1.25rem)] flex items-baseline justify-center gap-2"
          style={{ opacity: scoreOpacity, scale: scoreScale }}
        >
          <span className="ed-num text-[clamp(4.5rem,3rem+5vw,8rem)] font-medium leading-[0.8] text-ink">{EXAMPLE_SCORE}</span>
          <span className="ed-num text-[1.25rem] text-faint">/ {MAX_SCORE}</span>
        </motion.div>

        <motion.p
          className="absolute right-0 top-0 text-[13px] text-mut"
          style={{ opacity: miniOpacity }}
        >
          Overall <span className="ed-num font-medium text-ink">{EXAMPLE_SCORE}</span> / {MAX_SCORE} · example startup
        </motion.p>

        {FINDINGS.map((f, i) => (
          <Column key={f.key} f={f} index={i} p={p} />
        ))}
      </div>

      {/* Dimension names */}
      <div className="relative mt-4 h-5 border-t border-hair">
        {FINDINGS.map((f, i) => {
          const Icon = DIMENSION_ICON[f.key];
          return (
            <span
              key={f.key}
              className="absolute top-3 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-mut sm:text-[13px]"
              style={{ left: `${((i + 0.5) / FINDINGS.length) * 100}%` }}
            >
              <Icon aria-hidden className="hidden h-[18px] w-[18px] md:block" strokeWidth={1.5} />
              {f.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Column({ f, index, p }: { f: Finding; index: number; p: MotionValue<number> }) {
  const strong = f.delta > 0;
  const range = strong ? STRENGTH_IN : GAP_IN;
  // Stagger within the phase so the points move one after another, like a reading.
  const span = range[1] - range[0];
  const start = range[0] + (index / FINDINGS.length) * span * 0.5;
  const end = start + span * 0.5;

  const amount = useTransform(p, [start, end], [0, 1], { clamp: true });
  const pct = (Math.abs(f.delta) / MAX_DELTA) * 44; // % of chart height from the line
  const top = useTransform(amount, (a) => `calc(50% ${strong ? '-' : '+'} ${a * pct}%)`);
  const stem = useTransform(amount, (a) => `${a * pct}%`);
  const neutral = useTransform(amount, [0, 0.15], [1, 0]);
  const toned = useTransform(amount, [0, 0.15], [0, 1]);
  const label = useTransform(amount, [0.7, 1], [0, 1]);

  return (
    <div className="absolute inset-y-0" style={{ left: `${((index + 0.5) / FINDINGS.length) * 100}%` }}>
      {/* Stem from the benchmark to the point */}
      <motion.span
        aria-hidden
        className={cn('absolute left-0 w-px -translate-x-1/2', strong ? 'bottom-1/2 bg-mint' : 'top-1/2 bg-amber')}
        style={{ height: stem }}
      />
      <motion.div className="absolute left-0" style={{ top }}>
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-ink bg-paper"
            style={{ opacity: neutral }}
          />
          <motion.span
            aria-hidden
            className={cn('block h-3 w-3 rounded-full', strong ? 'bg-mint' : 'bg-amber')}
            style={{ opacity: toned, boxShadow: '0 0 0 4px var(--paper)' }}
          />
          <motion.span
            className={cn(
              'ed-num absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap text-[15px] font-medium',
              strong ? 'text-mint-ink' : 'text-amber-ink',
            )}
            style={{ opacity: label }}
          >
            {strong ? '+' : '−'}
            {Math.abs(f.delta)}
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
}

function Evidence({ phase }: { phase: number }) {
  const strengths = FINDINGS.filter((f) => f.delta > 0).sort((a, b) => b.delta - a.delta);
  const gaps = FINDINGS.filter((f) => f.delta < 0).sort((a, b) => a.delta - b.delta);

  return (
    <div className="mt-12 grid gap-8 sm:grid-cols-2 sm:gap-10">
      <EvidenceList title="Working" tone="mint" items={strengths} visible={phase >= 1} />
      <EvidenceList title="Not yet" tone="amber" items={gaps} visible={phase >= 2} />
    </div>
  );
}

function EvidenceList({
  title,
  tone,
  items,
  visible,
}: {
  title: string;
  tone: 'mint' | 'amber';
  items: Finding[];
  visible: boolean;
}) {
  return (
    <div className={cn('transition-opacity duration-700', visible ? 'opacity-100' : 'opacity-25')}>
      <p className="ed-label flex items-center gap-2 text-mut">
        <span className={cn('h-[7px] w-[7px] rounded-full', tone === 'mint' ? 'bg-mint' : 'bg-amber')} />
        {title}
      </p>
      <ul className="mt-4 border-t border-hair">
        {items.map((f) => (
          <li key={f.key} className="flex items-center gap-3 border-b border-hair py-3 text-[14px] leading-snug">
            <IconTile icon={DIMENSION_ICON[f.key]} tone={tone} size={22} />
            <span className="w-[7.5rem] shrink-0 font-medium text-ink">{f.name}</span>
            <span className="text-mut">{f.evidence}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
