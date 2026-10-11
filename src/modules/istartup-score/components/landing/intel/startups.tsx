'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ListChecks, ShieldCheck, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import { DIMENSION_COUNT, DIMENSIONS, FOCUS_ACTION, MAX_SCORE, SAMPLE_ACTIONS, SAMPLE_BAND, SAMPLE_SCORE, STRONGEST, WEAKEST } from './data';
import { Radar } from './radar';
import {
  ASSESSMENT_HREF,
  ButtonLink,
  IllustrativeTag,
  InsightCard,
  ProgressIndicator,
  SectionHeading,
  VIEW,
  useDelay,
  useTiming,
  wrap,
} from './primitives';

/**
 * From gaps to growth. The founder's result assembles in order: the profile, its
 * indicators, the radar, the areas to improve, then a path to the first next step.
 * Nothing claims the score will rise — only what to work on.
 */

const POINTS = [
  { icon: ShieldCheck, title: 'See your strengths', body: 'What is already working, and why it counts with investors.' },
  { icon: TriangleAlert, title: 'Find the gaps', body: 'What is missing or unproven, ranked by how much it holds you back.' },
  { icon: ListChecks, title: 'Know what to do next', body: 'A specific next step for each gap, small enough to start this week.' },
];

const IMPROVE = [...DIMENSIONS].sort((a, b) => a.percent - b.percent).slice(0, 2);

export function Startups() {
  return (
    <section id="startups" aria-labelledby="startups-title" className="bi-y scroll-mt-16">
      <div className={cn(wrap, 'grid items-center gap-x-14 gap-y-12 lg:grid-cols-12')}>
        <div className="lg:order-2 lg:col-span-5">
          <SectionHeading
            id="startups-title"
            eyebrow="For startups"
            title="Build your business with greater clarity."
            lead="Understand where your startup stands, uncover important gaps, and identify practical actions that can strengthen your business for the next stage of growth."
          />
          <ul className="mt-8 grid gap-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tile bg-mint-soft text-mint-ink">
                  <p.icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span>
                  <h3 className="bi-h3 text-ink">{p.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-mut">{p.body}</p>
                </span>
              </li>
            ))}
          </ul>
          <ButtonLink href={ASSESSMENT_HREF} arrow className="mt-9">
            Start Your Assessment
          </ButtonLink>
        </div>

        <div className="lg:order-1 lg:col-span-7">
          <FounderVisual />
        </div>
      </div>
    </section>
  );
}

function FounderVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, VIEW);
  const t = useTiming();
  const delay = useDelay();

  const card = (d: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
    transition: t(d, 0.55),
  });

  return (
    <div ref={ref} className="rounded-[24px] bg-mist p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-[1.05fr_1fr]">
        {/* The profile */}
        <motion.div className="flex flex-col rounded-card border border-line bg-surface p-4 shadow-card sm:row-span-2" {...card(0)}>
          <div className="flex items-center justify-between gap-2">
            <p className="bi-data font-semibold text-ink">Assessment profile</p>
            <span className="bi-data text-mut">{DIMENSION_COUNT} dimensions</span>
          </div>
          <div className="mx-auto mt-2 max-w-[320px]">
            <Radar on={on} delay={0.5} active={WEAKEST.key} labelSize={16} radius={100} title="Radar chart of the example startup's five dimension results" />
          </div>
          <ul className="mb-4 mt-3 flex flex-wrap gap-1.5">
            {DIMENSIONS.map((d) => (
              <li
                key={d.key}
                className={cn(
                  'bi-data rounded-full px-2.5 py-1',
                  d.key === WEAKEST.key ? 'bg-amber-soft text-amber-ink' : 'bg-mist text-mut',
                )}
              >
                {d.title} <span className="font-semibold">{d.percent}%</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-baseline gap-2 border-t border-line pt-4">
            <span className="text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">{SAMPLE_SCORE}</span>
            <span className="bi-data text-mut">/ {MAX_SCORE}</span>
            <span className="bi-data ml-auto rounded-full bg-mint-soft px-2.5 py-1 font-semibold text-mint-ink">{SAMPLE_BAND}</span>
          </div>
        </motion.div>

        {/* Areas to improve, emphasised once the radar has drawn */}
        <motion.div className="rounded-card border border-line bg-surface p-4 shadow-card" {...card(0.15)}>
          <p className="bi-data font-semibold text-ink">Improvement areas</p>
          <div className="mt-2 grid gap-1">
            {IMPROVE.map((d, i) => (
              <div
                key={d.key}
                className={cn(
                  '-mx-1 rounded-lg px-1 ring-1 ring-transparent transition-[box-shadow,background-color] duration-500',
                  on && i === 0 && 'bg-amber-soft/60 ring-amber/40',
                )}
                style={delay(1.6)}
              >
                <ProgressIndicator label={d.title} value={d.percent} tone="amber" on={on} delay={1.4 + i * 0.1} />
              </div>
            ))}
            <div className="mt-1 border-t border-line pt-2">
              <ProgressIndicator label={`${STRONGEST.title} · strength`} value={STRONGEST.percent} tone="mint" on={on} delay={1.6} />
            </div>
          </div>
        </motion.div>

        {/* The path from the result to the next step */}
        <div className="relative">
          <svg aria-hidden viewBox="0 0 40 28" className="absolute -top-4 left-6 h-7 w-10 overflow-visible">
            <motion.path
              d="M 4 0 C 4 16, 20 10, 20 28"
              fill="none"
              stroke="var(--mint)"
              strokeWidth={2}
              strokeDasharray="3 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: on ? 1 : 0 }}
              transition={t(2.0, 0.6)}
            />
          </svg>
          <InsightCard
            area={FOCUS_ACTION.dimension}
            title={FOCUS_ACTION.title}
            why={FOCUS_ACTION.gap}
            action={FOCUS_ACTION.action}
            priority={`1 of ${SAMPLE_ACTIONS.length}`}
            on={on}
            delay={2.2}
            className="mt-3"
          />
        </div>
      </div>
      <IllustrativeTag className="mt-4" />
    </div>
  );
}
