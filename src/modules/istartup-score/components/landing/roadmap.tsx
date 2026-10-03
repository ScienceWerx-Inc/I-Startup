'use client';

import { useState } from 'react';
import { Route } from 'lucide-react';

import { Reveal } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { AmbientBackground } from './ambient-background';
import { MAX_SCORE, ROADMAP, SAMPLE_BAND, SAMPLE_SCORE } from './data';
import { ProgressBar } from './progress-bar';
import { RoadmapItem } from './roadmap-item';
import { card, container } from './ui';

const POTENTIAL = ROADMAP.reduce((sum, s) => sum + s.impact, 0);

/** Results as a plan: the score, then ranked next steps that expand into explanations. */
export function Roadmap() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="roadmap" className="relative isolate section-y scroll-mt-20 overflow-hidden border-y border-edge bg-lavender/40">
      <AmbientBackground dots />
      <div className={cn(container, 'grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 xl:gap-24')}>
        <Reveal>
          <p className="kicker">Roadmap</p>
          <h2 className="display-lg mt-4 text-fg">
            A roadmap, <br className="hidden sm:block" />
            <span className="text-fg-muted">not just a number.</span>
          </h2>
          <p className="lead mt-6 max-w-[30rem]">
            Your results come with a personalised roadmap highlighting your strengths, key gaps and recommended actions
            so you know exactly what to focus on next.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className={cn(card, 'shadow-float p-5 sm:p-7')}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                  <Route className="h-4 w-4 text-blue" strokeWidth={1.75} aria-hidden />
                  Your score
                </p>
                <p className="mt-2 leading-none tabular">
                  <span className="text-5xl font-extrabold tracking-[-0.02em] text-fg">{SAMPLE_SCORE}</span>
                  <span className="ml-1.5 text-base font-medium text-fg-muted">/ {MAX_SCORE}</span>
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-lg bg-lavender px-3 py-1.5 text-[13px] font-semibold text-fg">
                <span className="h-1.5 w-1.5 rounded-full bg-purple" />
                {SAMPLE_BAND}
              </span>
            </div>
            <ProgressBar percent={(SAMPLE_SCORE / MAX_SCORE) * 100} className="mt-5 h-2" />

            <div className="mt-7 flex items-baseline justify-between gap-3 border-t border-edge pt-5">
              <h3 className="text-[15px] font-bold text-fg">Recommended next steps</h3>
              <p className="text-xs text-fg-muted tabular">Up to +{POTENTIAL} pts</p>
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
    </section>
  );
}
