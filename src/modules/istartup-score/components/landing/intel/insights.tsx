'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

import { cn } from '@/lib/utils';
import { FOCUS_ACTION, SAMPLE_ACTIONS } from './data';
import { IllustrativeTag, InsightCard, SectionHeading, VIEW, useTiming, wrap } from './primitives';

/**
 * Results into next steps. The recommendation panel is the product's own: an area to
 * improve, the gap in plain words, the suggested step, and its priority — ordered by
 * the points each action would recover.
 */

const RULES = [
  { k: 'What', v: 'Every gap names the specific question it comes from.' },
  { k: 'Why', v: 'A plain-language explanation of what is holding the score back.' },
  { k: 'Next', v: 'One concrete step, small enough to start this week.' },
  { k: 'Order', v: 'Actions ranked by how many points each would recover.' },
];

export function Insights() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, VIEW);
  const t = useTiming();
  const queue = SAMPLE_ACTIONS.slice(1);

  return (
    <section id="insights" aria-labelledby="insights-title" className="bi-y scroll-mt-16">
      <div className={cn(wrap, 'grid items-center gap-x-14 gap-y-12 lg:grid-cols-12')}>
        <div className="lg:col-span-5">
          <SectionHeading
            id="insights-title"
            eyebrow="Actionable insights"
            title="Turn assessment results into meaningful next steps."
            lead="A score says where you are. The report says what to do about it, and in what order."
          />
          <dl className="mt-8 grid gap-4">
            {RULES.map((r) => (
              <div key={r.k} className="grid grid-cols-[4.5rem_1fr] gap-4 border-t border-line pt-4">
                <dt className="bi-eyebrow pt-0.5 text-funder">{r.k}</dt>
                <dd className="text-[15px] leading-relaxed text-mut">{r.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div ref={ref} className="lg:col-span-6 lg:col-start-7">
          <div className="rounded-[24px] bg-mist p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="bi-data font-semibold text-ink">Priority actions</p>
              <IllustrativeTag />
            </div>
            <InsightCard
              area={FOCUS_ACTION.dimension}
              title={FOCUS_ACTION.title}
              why={FOCUS_ACTION.gap}
              action={FOCUS_ACTION.action}
              points={FOCUS_ACTION.points}
              priority={`Priority 1 of ${SAMPLE_ACTIONS.length}`}
              on={on}
              delay={0.1}
            />
            <ol className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2" start={2}>
              {queue.map((a, i) => (
                <motion.li
                  key={a.id}
                  className="flex items-center gap-3 rounded-tile border border-line bg-surface px-4 py-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={t(0.8 + i * 0.1, 0.45)}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mist text-[12px] font-semibold text-mut tabular-nums">
                    {i + 2}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">
                      {a.dimension} · {a.title}
                    </span>
                    <span className="block truncate text-[13px] text-mut">{a.action}</span>
                  </span>
                  <span className="bi-data shrink-0 text-mut">+{a.points} pts</span>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
