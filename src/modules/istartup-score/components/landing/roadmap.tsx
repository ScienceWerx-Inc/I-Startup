'use client';

import { useState } from 'react';

import { Reveal } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { MAX_SCORE, ROADMAP, SAMPLE_BAND, SAMPLE_SCORE } from './data';
import { ProgressBar } from './progress-bar';
import { RoadmapItem } from './roadmap-item';
import { card, container } from './ui';

const POTENTIAL = ROADMAP.reduce((sum, s) => sum + s.impact, 0);

/** Results as a plan, on an inverted black block: the score, then ranked next steps that expand. */
export function Roadmap() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="roadmap" className="scroll-mt-24">
      <div className={container}>
        <div className="grid items-center gap-12 rounded-[40px] bg-carbon px-5 py-12 text-on-dark sm:rounded-arc sm:px-10 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-16 lg:py-20">
          <Reveal>
            <p className="kicker">Roadmap</p>
            <h2 className="display-lg mt-6">A roadmap, not just a number.</h2>
            <p className="mt-6 max-w-[30rem] text-[var(--fs-lead)] leading-[var(--leading-body)] text-on-dark-muted">
              Your results come with a personalised roadmap highlighting your strengths, key gaps and recommended
              actions so you know exactly what to focus on next.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className={cn(card, 'p-5 text-fg sm:p-8')}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs tracking-[-0.03em] text-fg-muted">Your score</p>
                  <p className="mt-2 leading-none tabular">
                    <span className="font-display text-5xl font-bold leading-[0.9] tracking-[-0.03em]">{SAMPLE_SCORE}</span>
                    <span className="ml-2 font-display text-lg font-semibold uppercase text-fg-muted">/ {MAX_SCORE}</span>
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-fund-soft px-3.5 py-1.5 text-sm font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                  {SAMPLE_BAND}
                </span>
              </div>
              <ProgressBar percent={(SAMPLE_SCORE / MAX_SCORE) * 100} className="mt-5 h-2" />

              <div className="mt-7 flex items-baseline justify-between gap-3 border-t border-edge pt-5">
                <h3 className="text-base font-semibold">Recommended next steps</h3>
                <p className="font-mono text-xs tracking-[-0.03em] text-fg-muted tabular">Up to +{POTENTIAL} pts</p>
              </div>
              <ol className="mt-3">
                {ROADMAP.map((step, i) => (
                  <RoadmapItem
                    key={step.title}
                    step={step}
                    index={i}
                    last={i === ROADMAP.length - 1}
                    open={open === i}
                    onToggle={() => setOpen((cur) => (cur === i ? null : i))}
                  />
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
