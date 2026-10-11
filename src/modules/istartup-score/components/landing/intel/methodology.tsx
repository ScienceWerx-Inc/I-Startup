'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ClipboardCheck, Database, ListChecks, Sigma, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { DIMENSIONS, HEAVIEST, MAX_SCORE, QUESTION_COUNT } from './data';
import { SectionHeading, VIEW, useTiming, wrap } from './primitives';

/**
 * The calm section. How the score is made and what happens to the data, stated
 * plainly — with one small diagram and a single line drawing.
 */

const ITEMS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ClipboardCheck,
    title: 'Structured criteria',
    body: 'Every question offers five written descriptions. You choose the one that matches your startup today, so an answer means the same thing for everyone.',
  },
  {
    icon: Sigma,
    title: 'Understandable results',
    body: `Each dimension's result is a percentage. The score is their weighted sum, scaled to ${MAX_SCORE}; ${HEAVIEST} carries the most weight.`,
  },
  {
    icon: ListChecks,
    title: 'Actionable recommendations',
    body: 'Every gap carries a recommended next step, and the steps are ordered by how many points each would recover.',
  },
  {
    icon: Database,
    title: 'Responsible data handling',
    body: 'Your draft stays in your browser while you work. A finished report is saved to your account — and with your application, if you linked one. Passwords are stored hashed; payments go through Stripe.',
  },
];

export function Methodology() {
  return (
    <section id="methodology" aria-labelledby="methodology-title" className="bi-y scroll-mt-16 bg-mist">
      <div className={cn(wrap, 'grid gap-x-14 gap-y-12 lg:grid-cols-12')}>
        <div className="lg:col-span-5">
          <SectionHeading
            id="methodology-title"
            eyebrow="Trust and methodology"
            title="A score is only as useful as the insight behind it."
            lead={`${QUESTION_COUNT} questions, ${DIMENSIONS.length} weighted dimensions, one transparent formula.`}
          />
          <Framework />
        </div>
        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-7 lg:self-center">
          {ITEMS.map((it) => (
            <li key={it.title}>
              <div className="flex items-center gap-3">
                <it.icon aria-hidden className="h-5 w-5 text-funder" strokeWidth={1.75} />
                <h3 className="bi-h3 text-ink">{it.title}</h3>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-mut">{it.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Dimensions × weights → one output. */
function Framework() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, VIEW);
  const t = useTiming();
  const rowH = 30;
  const h = DIMENSIONS.length * rowH;

  return (
    <motion.div
      ref={ref}
      className="mt-10 rounded-card border border-line bg-surface p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: on ? 1 : 0 }}
      transition={t(0, 0.5)}
    >
      <svg role="img" aria-label={`Each dimension's result, multiplied by its weight, adds up to the score out of ${MAX_SCORE}`} viewBox={`0 0 360 ${h}`} className="h-auto w-full">
        {DIMENSIONS.map((d, i) => {
          const y = i * rowH + rowH / 2;
          return (
            <g key={d.key}>
              <text x={0} y={y + 4} fontSize={12.5} fontWeight={500} fill="var(--ink)">
                {d.title}
              </text>
              <text x={150} y={y + 4} fontSize={12} textAnchor="end" fill="var(--mut)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {`× ${d.weight.toFixed(2)}`}
              </text>
              <path d={`M 160 ${y} C 205 ${y}, 205 ${h / 2}, 250 ${h / 2}`} fill="none" stroke="var(--line-strong)" />
            </g>
          );
        })}
        {/* The one drawn line: from the sum into the output. */}
        <motion.path
          d={`M 250 ${h / 2} L 282 ${h / 2}`}
          stroke="var(--mint)"
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: on ? 1 : 0 }}
          transition={t(0.4, 0.6)}
        />
        <rect x={286} y={h / 2 - 22} width={74} height={44} rx={10} fill="var(--ink)" />
        <text x={323} y={h / 2 - 2} textAnchor="middle" fontSize={13} fontWeight={650} fill="#fff">
          Score
        </text>
        <text x={323} y={h / 2 + 13} textAnchor="middle" fontSize={10.5} fill="rgba(255,255,255,0.7)">
          {`out of ${MAX_SCORE}`}
        </text>
      </svg>
    </motion.div>
  );
}
