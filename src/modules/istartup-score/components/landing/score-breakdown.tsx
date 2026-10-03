'use client';

import { useState } from 'react';

import { Reveal } from '@/components/reveal';
import { cn } from '@/lib/utils';

import type { CategoryKey } from '../../assessment/bank';
import { CircularScore } from './circular-score';
import { DIMENSIONS, MAX_SCORE } from './data';
import { DimensionCard } from './dimension-card';
import { container } from './ui';

const HIGHEST = Math.max(...DIMENSIONS.map((d) => d.weight));

/** The five-dimension framework: a segmented score ring linked to five cards. */
export function ScoreBreakdown() {
  const [active, setActive] = useState<CategoryKey | null>(null);

  return (
    <section id="framework" className="section-y scroll-mt-20">
      <div className={container}>
        <Reveal className="max-w-2xl">
          <p className="kicker">Framework</p>
          <h2 className="display-lg mt-4 text-fg">
            Five weighted <br className="hidden sm:block" />
            dimensions.
          </h2>
          <p className="lead mt-6">
            Your total score of {MAX_SCORE} is the weighted sum of five independent sections. Momentum carries the most
            weight, because evidence in the market is usually more convincing than a stack of slides.
          </p>
        </Reveal>

        <div className={cn('mt-14 grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16')}>
          <Reveal className="mx-auto w-full max-w-[460px]">
            <CircularScore dimensions={DIMENSIONS} active={active} onActive={setActive} />
          </Reveal>
          <ul className="grid gap-3">
            {DIMENSIONS.map((d, i) => (
              <Reveal key={d.key} delay={i * 70} as="li">
                <DimensionCard
                  dimension={d}
                  index={i}
                  highestWeight={d.weight === HIGHEST}
                  active={active === d.key}
                  onActive={(on) => setActive((cur) => (on ? d.key : cur === d.key ? null : cur))}
                />
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
