'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';
import { Gauge } from 'lucide-react';

import { EASE_OUT } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { DIMENSIONS, MAX_SCORE, SAMPLE_BAND, SAMPLE_SCORE, SCORE_HISTORY } from './data';
import { RadarChart } from './radar-chart';

/**
 * The hero's "app window": score, band, a radar of the five dimensions and a small
 * score-over-time chart. All live SVG/HTML — an illustrative example profile.
 */
export function ScoreDashboard({ active = false, className }: { active?: boolean; className?: string }) {
  return (
    <div className={cn('rounded-panel border border-edge bg-surface p-5 shadow-float sm:p-6', className)}>
      {/* Window chrome */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-soft text-blue">
            <Gauge className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-fg">iSTARTUP Score</span>
        </div>
        <span className="rounded-md border border-edge px-2 py-0.5 text-[11px] font-medium text-fg-muted">Example</span>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <p className="leading-none tabular">
          <span className="text-[52px] font-extrabold tracking-[-0.02em] text-fg sm:text-6xl">{SAMPLE_SCORE}</span>
          <span className="ml-1.5 text-lg font-medium text-fg-muted">/ {MAX_SCORE}</span>
        </p>
        <span className="mb-1 inline-flex items-center gap-2 rounded-lg bg-lavender px-3 py-1.5 text-[13px] font-semibold text-fg">
          <span className="h-1.5 w-1.5 rounded-full bg-purple" />
          {SAMPLE_BAND}
        </span>
      </div>

      <div className="mt-4 rounded-card border border-edge bg-bg/60 px-2 pb-1 pt-3">
        <RadarChart dimensions={DIMENSIONS} active={active} className="mx-auto max-w-[340px]" />
      </div>

      <ScoreOverTime />
    </div>
  );
}

function ScoreOverTime() {
  const id = useId().replace(/:/g, '');
  const W = 300;
  const H = 72;
  const values = SCORE_HISTORY.map((p) => p.value);
  const min = Math.min(...values) - 20;
  const max = Math.max(...values) + 10;
  const pts = SCORE_HISTORY.map((p, i) => [
    (i / (SCORE_HISTORY.length - 1)) * W,
    H - ((p.value - min) / (max - min)) * H,
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const [ex, ey] = pts[pts.length - 1];

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-semibold text-fg">Score over time</p>
        <p className="text-xs text-fg-muted tabular">
          {SCORE_HISTORY[0].label} – {SCORE_HISTORY[SCORE_HISTORY.length - 1].label}
        </p>
      </div>
      <svg viewBox={`-4 -8 ${W + 8} ${H + 12}`} className="mt-2 block h-auto w-full overflow-visible" role="img" aria-label={`Score rising from ${values[0]} to ${values[values.length - 1]} over six months.`}>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.33, 0.66].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--border)" strokeDasharray="3 4" />
        ))}
        <motion.path d={area} fill={`url(#${id}-fill)`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1 }} />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.6 }}
        />
        <motion.circle
          cx={ex}
          cy={ey}
          r="4"
          fill="var(--blue)"
          stroke="var(--surface)"
          strokeWidth="2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-fg-muted tabular">
        {SCORE_HISTORY.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}
