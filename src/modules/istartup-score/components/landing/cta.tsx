'use client';

import Link from 'next/link';

import { Reveal } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { SAMPLE_SCORE } from './data';
import { ScorePodium } from './illustrations/scenes';
import { btnOnDark, container } from './ui';

/** The closing call to action: a flat navy block that rises out of the canvas, with the score as a gauge. */
export function CTA() {
  return (
    <section className="rounded-t-arc bg-carbon text-on-dark">
      <div className={cn(container, 'section-y grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]')}>
        <Reveal>
          <p className="kicker">Get started</p>
          <h2 className="display-lg mt-6">Ready to see where you stand?</h2>
          <p className="mt-6 max-w-[32rem] text-[var(--fs-lead)] leading-[var(--leading-body)] text-on-dark-muted">
            Your iSTARTUP Score is a key part of the PNPL application. It takes about ten minutes, and your progress is
            saved as you go.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/interview" className={btnOnDark()}>
              Calculate your score
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-[4px] border-[1.5px] border-on-dark-muted px-6 text-base font-medium text-on-dark transition-colors hover:border-on-dark"
            >
              See how it works
            </a>
          </div>
        </Reveal>

        <Reveal delay={120} className="mx-auto w-full max-w-[460px] lg:justify-self-end">
          <ScorePodium score={SAMPLE_SCORE} />
        </Reveal>
      </div>
    </section>
  );
}
