'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';

import { cn } from '@/lib/utils';
import { DIMENSION_ICON } from '../editorial/icons';
import { DIMENSIONS, LEVEL_LABEL, MAX_SCORE, SAMPLE_BAND, SAMPLE_SCORE, WEAKEST, toneFor, type CategoryKey } from './data';
import { Radar } from './radar';
import { IllustrativeTag, SectionHeading, VIEW, useTiming, wrap } from './primitives';

/**
 * The five real dimensions and their real weights, with the example startup's results
 * on a radar. Choosing a dimension highlights it on the chart and opens its detail;
 * it starts on the one the example most needs to work on.
 */
export function Dimensions() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, VIEW);
  const t = useTiming();
  const [active, setActive] = useState<CategoryKey>(WEAKEST.key);
  const current = DIMENSIONS.find((d) => d.key === active)!;

  return (
    <section id="platform" aria-labelledby="platform-title" className="bi-y scroll-mt-16">
      <div className={wrap}>
        <SectionHeading
          id="platform-title"
          eyebrow="Assessment dimensions"
          title="A clearer picture of business readiness."
          lead="Five dimensions, each weighted by how much it matters to readiness. Together they make the score; apart, they show where to look."
        />

        <div ref={ref} className="mt-12 grid items-center gap-x-12 gap-y-10 lg:mt-14 lg:grid-cols-12">
          {/* The chart */}
          <div className="rounded-[24px] bg-mist p-5 sm:p-8 lg:col-span-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[14px] text-mut">
                Example score{' '}
                <span className="text-[20px] font-semibold tracking-[-0.02em] text-ink tabular-nums">{SAMPLE_SCORE}</span> / {MAX_SCORE}
                <span className="bi-data ml-2 rounded-full bg-mint-soft px-2.5 py-1 font-semibold text-mint-ink">{SAMPLE_BAND}</span>
              </p>
              <IllustrativeTag />
            </div>
            <div className="mx-auto mt-4 max-w-[440px]">
              <Radar on={on} delay={0.1} active={active} labelSize={14} title="Radar chart of the example startup across the five assessment dimensions" />
            </div>
          </div>

          {/* The dimensions */}
          <div className="lg:col-span-6">
            <ul className="grid gap-2" aria-label="Assessment dimensions">
              {DIMENSIONS.map((d, i) => {
                const Icon = DIMENSION_ICON[d.key];
                const selected = d.key === active;
                const tone = toneFor(d.level);
                return (
                  <motion.li
                    key={d.key}
                    initial={{ opacity: 0, x: 12 }}
                    animate={on ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
                    transition={t(0.4 + i * 0.07, 0.45)}
                  >
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setActive(d.key)}
                      onMouseEnter={() => setActive(d.key)}
                      onFocus={() => setActive(d.key)}
                      className={cn(
                        'grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-4 rounded-card border px-4 py-3 text-left transition-[background-color,border-color,box-shadow] duration-200',
                        selected ? 'border-line bg-surface shadow-card' : 'border-transparent hover:bg-mist',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-tile transition-colors duration-200',
                          selected ? 'bg-ink text-on-dark' : 'bg-mist text-funder',
                        )}
                      >
                        <Icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[16px] font-semibold text-ink">{d.title}</span>
                        <span className="bi-data block truncate text-mut">{Math.round(d.weight * 100)}% of the score</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[15px] font-semibold text-ink tabular-nums">{d.percent}%</span>
                        <span className={cn('bi-data block', tone === 'amber' ? 'text-amber-ink' : 'text-mint-ink')}>
                          {LEVEL_LABEL[d.level]}
                        </span>
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </ul>

            {/* The insight panel for the chosen dimension */}
            <div className="mt-4 rounded-card border border-line bg-surface p-5" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current.key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={t(0, 0.25)}
                >
                  <p className="bi-data font-semibold text-funder">{current.title} measures</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{current.summary}</p>
                  <p className="bi-data mt-3 text-mut">
                    In the example, {current.title} is{' '}
                    <span className={cn('font-semibold', toneFor(current.level) === 'amber' ? 'text-amber-ink' : 'text-mint-ink')}>
                      {LEVEL_LABEL[current.level].toLowerCase()} at {current.percent}%
                    </span>
                    {current.key === WEAKEST.key ? ' — the dimension it most needs to work on.' : '.'}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
