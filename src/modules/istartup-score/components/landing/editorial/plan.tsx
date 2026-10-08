'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';

import { cn } from '@/lib/utils';
import { FINDINGS, PLANS } from './example';
import type { CategoryKey } from '../../../assessment/bank';
import { DIMENSION_ICON, WHEN_ICON } from './icons';
import { EASE, Reveal, SectionIndex, wrap } from './shared';

/**
 * Insight → action. Pick one of the gaps found in 03; its plan reads top to bottom
 * along a line that draws itself as you scroll, filling each step as it arrives.
 */
export function Plan() {
  const [active, setActive] = useState(0);
  const plan = PLANS[active];

  const listRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 75%', 'end 55%'] });
  const drawn = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  return (
    <section id="improve" aria-labelledby="plan-title" className="ed-y scroll-mt-16">
      <div className={wrap}>
        <SectionIndex index="04" stage="Improve" />

        <div className="mt-10 lg:mt-14">
          <Reveal>
            <h2 id="plan-title" className="ed-h2 max-w-[14ch] text-balance sm:max-w-none">
              <span className="text-faint">Don’t just get a score.</span>
              <br />
              Get a plan.
            </h2>
          </Reveal>
        </div>

        <div className="mt-12 grid grid-cols-12 gap-x-6 gap-y-12 lg:mt-14">
          {/* The gap */}
          <div className="col-span-12 lg:col-span-5">
            <Reveal>
              <p className="ed-lead max-w-[26rem] text-pretty">
                Every gap comes with a next step — specific, in order, and small enough to start this week.
              </p>
            </Reveal>

            <Reveal delay={0.1} className="mt-12">
              <p className="ed-label text-mut">From your gaps</p>
              <div role="tablist" aria-label="Gaps" className="mt-4 border-t border-hair">
                {PLANS.map((pl, i) => {
                  const finding = FINDINGS.find((f) => f.key === pl.key)!;
                  const selected = active === i;
                  return (
                    <button
                      key={pl.key}
                      id={`gap-tab-${pl.key}`}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      aria-controls="plan-panel"
                      onClick={() => setActive(i)}
                      className={cn(
                        'group flex w-full items-start gap-4 border-b border-hair py-6 text-left transition-colors duration-300',
                        selected ? 'text-ink' : 'text-faint hover:text-ink',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-[0.55em] h-[9px] w-[9px] shrink-0 rounded-full transition-colors duration-300',
                          selected ? 'bg-amber' : 'border border-hair-strong bg-transparent group-hover:border-amber',
                        )}
                      />
                      <span className="flex-1">
                        <span className="flex items-center gap-1.5 text-[13px] font-medium text-mut">
                          <DimensionIcon dimension={pl.key} />
                          {finding.name} <span className="text-amber-ink">−{Math.abs(finding.delta)}</span>
                        </span>
                        <span className="font-headline mt-1 block text-[clamp(1.25rem,1rem+0.8vw,1.625rem)] leading-[1.15] tracking-[-0.02em]">
                          {pl.gap}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Reveal>
          </div>

          {/* The plan */}
          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <div ref={listRef} id="plan-panel" role="tabpanel" aria-labelledby={`gap-tab-${plan.key}`} className="relative pl-12 sm:pl-16">
              {/* The line: drawn by scroll */}
              <span aria-hidden className="absolute bottom-3 left-[5px] top-3 w-px bg-hair-strong" />
              <motion.span
                aria-hidden
                className="absolute left-[5px] top-3 w-px origin-top bg-ink"
                style={{ scaleY: drawn, height: 'calc(100% - 1.5rem)' }}
              />

              <AnimatePresence mode="wait" initial={false}>
                <motion.ol
                  key={plan.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="grid gap-14 sm:gap-16"
                >
                  {plan.steps.map((s, i) => (
                    <Step key={s.when} step={s} index={i} total={plan.steps.length} drawn={drawn} />
                  ))}
                </motion.ol>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({
  step,
  index,
  total,
  drawn,
}: {
  step: { when: string; what: string; why: string };
  index: number;
  total: number;
  drawn: MotionValue<number>;
}) {
  const at = total === 1 ? 0 : index / (total - 1);
  const reached = useTransform(drawn, [Math.max(0, at - 0.06), at], [0, 1]);
  const last = index === total - 1;

  return (
    <li className="relative">
      {/* Each step fills when the line reaches it. The last one loops back to the score. */}
      <span className="absolute -left-12 top-[0.3em] h-[11px] w-[11px] sm:-left-16">
        <span className="absolute inset-0 rounded-full border border-hair-strong bg-paper" />
        <motion.span
          className={cn('absolute inset-0 rounded-full', last ? 'bg-mint' : 'bg-signal')}
          style={{ opacity: reached, scale: reached, boxShadow: '0 0 0 4px var(--paper)' }}
        />
      </span>
      <p className="ed-label flex items-center gap-2 text-mut">
        <WhenIcon when={step.when} />
        {step.when}
      </p>
      <p className="font-headline mt-3 text-[clamp(1.375rem,1.1rem+1vw,2rem)] leading-[1.12] tracking-[-0.025em] text-ink">
        {step.what}
      </p>
      <p className="mt-3 max-w-[30rem] text-[15px] leading-relaxed text-mut">{step.why}</p>
    </li>
  );
}

function WhenIcon({ when }: { when: string }) {
  const Icon = WHEN_ICON[when];
  return Icon ? <Icon aria-hidden className="h-5 w-5 text-signal" strokeWidth={1.5} /> : null;
}

function DimensionIcon({ dimension }: { dimension: CategoryKey }) {
  const Icon = DIMENSION_ICON[dimension];
  return <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.5} />;
}
