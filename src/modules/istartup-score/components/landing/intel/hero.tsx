'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { AssessmentEngine } from './engine';
import { ASSESSMENT_HREF, ButtonLink, Eyebrow, useTiming, wrap } from './primitives';

/**
 * Copy first, then the engine. The copy is readable within half a second; the engine
 * assembles beside it over the next three.
 */
export function Hero() {
  const t = useTiming();
  const up = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: t(delay, 0.55),
  });

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className={cn(wrap, 'grid items-center gap-x-10 gap-y-12 pb-16 pt-10 sm:pt-14 lg:grid-cols-12 lg:pb-24 lg:pt-16')}>
        <div className="lg:col-span-6">
          <motion.div {...up(0)}>
            <Eyebrow>Startup assessment &amp; business intelligence</Eyebrow>
          </motion.div>
          <motion.h1 id="hero-title" className="bi-h1 mt-5 text-balance text-ink" {...up(0.06)}>
            Know Your Score.
            <br />
            <span className="text-midnight">Build What&apos;s Next.</span>
          </motion.h1>
          <motion.p className="bi-lead mt-6 max-w-[36rem] text-pretty text-mut" {...up(0.14)}>
            Understand your startup&apos;s strengths, uncover critical gaps, and discover the actions that can move
            your business forward. Give funders a clearer view of startup readiness through structured assessment
            and actionable insights.
          </motion.p>
          <motion.div className="mt-8 flex flex-col gap-3 sm:flex-row" {...up(0.22)}>
            <ButtonLink href={ASSESSMENT_HREF} arrow>
              Assess Your Startup
            </ButtonLink>
            <ButtonLink href="#funders" variant="secondary">
              For Funders
            </ButtonLink>
          </motion.div>
          <motion.p className="mt-6 flex items-center gap-2 text-[14px] text-mut" {...up(0.3)}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-mint" />
            Structured assessment. Clearer insights. More informed decisions.
          </motion.p>
        </div>

        <div className="mx-auto w-full max-w-[640px] lg:col-span-6 lg:max-w-none">
          <AssessmentEngine />
        </div>
      </div>
    </section>
  );
}
