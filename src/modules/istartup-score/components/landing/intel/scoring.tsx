'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { MessageSquareText, Scale, ShieldAlert, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { BAND_RANGES, DIMENSIONS, QUESTION_COUNT } from './data';
import { Accent, SectionHeading, VIEW, useTiming, wrap } from './primitives';

/**
 * What the score means, and what it cannot tell you: the four bands with their ranges,
 * and the limits, stated plainly. It claims no authorship or validation the product has
 * not documented.
 */

const LIMITS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MessageSquareText,
    title: 'Self-reported',
    body: 'The score reflects your own answers. Nothing is independently verified.',
  },
  {
    icon: Scale,
    title: 'Read in context',
    body: 'Every startup answers the same questions, whatever its stage or business model. Compare results with that in mind.',
  },
  {
    icon: ShieldAlert,
    title: 'Not a funding decision',
    body: 'A band describes readiness signals in your answers. It is not a certification, due diligence or a prediction of returns.',
  },
];

/** Lowest band to highest, from neutral to brand. */
const BAND_FILL = ['bg-line-strong', 'bg-funder/40', 'bg-funder', 'bg-mint'];

export function Scoring() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, VIEW);
  const t = useTiming();
  const card = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
    transition: t(delay, 0.5),
  });

  return (
    <section id="scoring" aria-labelledby="scoring-title" className="bi-y bi-canvas scroll-mt-16 bg-mist">
      <div className={cn(wrap, 'grid gap-x-14 gap-y-12 lg:grid-cols-12')}>
        <div className="lg:col-span-5">
          <SectionHeading
            id="scoring-title"
            eyebrow="How the score works"
            title={
              <>
                What the score means, <Accent>and its limits.</Accent>
              </>
            }
            lead={`${QUESTION_COUNT} questions across ${DIMENSIONS.length} weighted dimensions. Each answer is a written description, so it means the same thing for everyone.`}
          />
          <ul className="mt-8 grid gap-5">
            {LIMITS.map((l) => (
              <li key={l.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tile bg-surface text-funder shadow-card">
                  <l.icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span>
                  <h3 className="bi-h3 text-ink">{l.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-mut">{l.body}</p>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div ref={ref} className="grid gap-4 lg:col-span-7 lg:self-center">
          <motion.div className="bi-glass rounded-card p-5 sm:p-6" {...card(0.1)}>
            <h3 className="bi-data font-semibold text-ink">Readiness bands</h3>
            <ol className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
              {BAND_RANGES.map((b, i) => (
                <li key={b.label}>
                  <span aria-hidden className={cn('block h-1.5 rounded-full', BAND_FILL[i])} />
                  <span className="mt-2.5 block text-[14px] font-semibold text-ink">{b.label}</span>
                  <span className="bi-data block text-mut tabular-nums">
                    {b.from}–{b.to}
                  </span>
                </li>
              ))}
            </ol>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
