'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  DIMENSIONS,
  MAX_SCORE,
  SAMPLE_ACTIONS,
  SAMPLE_BAND,
  SAMPLE_SCORE,
  SAMPLE_STAGE,
  SAMPLE_STRENGTHS,
  toneFor,
} from './data';
import {
  ASSESSMENT_HREF,
  Accent,
  ButtonLink,
  IllustrativeTag,
  ProgressIndicator,
  SectionHeading,
  VIEW,
  useTiming,
  wrap,
} from './primitives';

/**
 * What is free, what the one payment unlocks, and a look at the full report itself — built
 * from the example startup's answers run through the real scoring, and labelled as such.
 */

const FREE = [`Your score out of ${MAX_SCORE}`, 'Your readiness band'];
const FULL = [
  'A result for every dimension',
  'Key strengths and critical gaps',
  'Priority actions, each with a next step',
  'Every response you gave',
  'PDF download',
];

/** `reportPrice`: the full report's price, formatted on the server from the payment config. */
export function Pricing({ reportPrice }: { reportPrice: string }) {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="bi-y scroll-mt-16">
      <div className={cn(wrap, 'grid gap-x-14 gap-y-12 lg:grid-cols-12')}>
        <div className="lg:col-span-5">
          <SectionHeading
            id="pricing-title"
            eyebrow="What you get"
            title={
              <>
                Start free. <Accent>Unlock the full report.</Accent>
              </>
            }
            lead="Your score and readiness band appear as soon as you finish. The full report is one payment, and it stays unlocked for every assessment you take."
          />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Tier name="Free" price="When you finish" items={FREE} />
            <Tier name="Full report" price={`${reportPrice}, one-time`} items={FULL} featured />
          </div>
          <div className="mt-8">
            <ButtonLink href={ASSESSMENT_HREF} variant="ink" arrow className="h-[54px]">
              Start your assessment
            </ButtonLink>
          </div>
        </div>

        <div className="lg:col-span-7 lg:self-center">
          <SampleReport />
        </div>
      </div>
    </section>
  );
}

function Tier({ name, price, items, featured = false }: { name: string; price: string; items: string[]; featured?: boolean }) {
  return (
    <div className={cn('bi-glass rounded-card p-5', featured && 'border-funder/40')}>
      <h3 className="bi-h3 text-ink">{name}</h3>
      <p className={cn('bi-data mt-1 font-semibold', featured ? 'text-funder' : 'text-mut')}>{price}</p>
      <ul className="mt-4 grid gap-2">
        {items.map((it) => (
          <li key={it} className="flex gap-2 text-[14px] leading-snug text-ink">
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-mint-ink" strokeWidth={2.25} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The full report for the example startup, in brief. */
function SampleReport() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, VIEW);
  const t = useTiming();

  return (
    <motion.div
      ref={ref}
      className="bi-canvas bi-glass rounded-panel p-5 sm:p-7"
      initial={{ opacity: 0, y: 16 }}
      animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={t(0, 0.6)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="bi-data text-mut">Full report · Example startup</p>
          <p className="mt-0.5 text-[15px] font-semibold text-ink">{SAMPLE_STAGE}</p>
        </div>
        <IllustrativeTag />
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-2">
        <span className="text-[40px] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">{SAMPLE_SCORE}</span>
        <span className="bi-data text-mut">/ {MAX_SCORE}</span>
        <span className="bi-data ml-auto rounded-full bg-mint-soft px-2.5 py-1 font-semibold text-mint-ink">{SAMPLE_BAND}</span>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-6 border-t border-line pt-5 sm:grid-cols-2">
        <div>
          <h3 className="bi-data font-semibold text-ink">Results by dimension</h3>
          <div className="mt-3 grid gap-2.5">
            {DIMENSIONS.map((d, i) => (
              <ProgressIndicator key={d.key} label={d.title} value={d.percent} tone={toneFor(d.level)} on={on} delay={0.3 + i * 0.07} />
            ))}
          </div>
        </div>

        <div className="grid content-start gap-5">
          <div>
            <h3 className="bi-data font-semibold text-ink">Key strengths</h3>
            <ul className="mt-2 grid gap-2">
              {SAMPLE_STRENGTHS.map((s) => (
                <li key={s.id} className="flex gap-2 text-[13px] leading-snug text-mut">
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-mint-ink" strokeWidth={2.25} />
                  <span>
                    <span className="font-semibold text-ink">{s.dimension}.</span> {s.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="bi-data font-semibold text-ink">Priority actions</h3>
            <ol className="mt-2 grid gap-2">
              {SAMPLE_ACTIONS.map((a, i) => (
                <li key={a.id} className="flex gap-2.5 text-[13px] leading-snug">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mist text-[11px] font-semibold text-mut tabular-nums">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-semibold text-ink">
                      {a.dimension} · {a.title}
                    </span>
                    <span className="block text-mut">{a.action}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
