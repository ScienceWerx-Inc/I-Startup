'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

import { EASE_OUT } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { DIMENSIONS, MAX_SCORE, SAMPLE_BAND, SAMPLE_SCORE, SCORE_HISTORY } from './data';
import { RadarChart } from './radar-chart';

/**
 * The hero's score card: score, band, a radar of the five dimensions and a small
 * score-over-time chart. All live SVG/HTML — an illustrative example profile.
 */
export function ScoreDashboard({ className }: { className?: string }) {
  const [active, setActive] = useState(false);

  return (
    <div
      className={cn('rounded-panel bg-surface p-6 sm:p-8', className)}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs tracking-[-0.03em] text-fg-muted">iSTARTUP Score</span>
        <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs tracking-[-0.03em] text-fg-muted">Example</span>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <p className="leading-none tabular">
          <span className="font-display text-[64px] font-bold leading-[0.85] tracking-[-0.03em] text-fg sm:text-[76px]">{SAMPLE_SCORE}</span>
          <span className="ml-2 font-display text-2xl font-semibold uppercase text-fg-muted">/ {MAX_SCORE}</span>
        </p>
        <span className="mb-1 inline-flex items-center gap-2 rounded-full bg-fund-soft px-3.5 py-1.5 text-sm font-medium text-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-ink" />
          {SAMPLE_BAND}
        </span>
      </div>

      <div className="mt-6 rounded-card bg-surface-2 px-2 pb-1 pt-3">
        <RadarChart dimensions={DIMENSIONS} active={active} className="mx-auto max-w-[340px]" />
      </div>

      <ScoreOverTime />
    </div>
  );
}

function ScoreOverTime() {
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
    <div className="mt-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-fg">Score over time</p>
        <p className="font-mono text-xs tracking-[-0.03em] text-fg-muted tabular">
          {SCORE_HISTORY[0].label} – {SCORE_HISTORY[SCORE_HISTORY.length - 1].label}
        </p>
      </div>
      <svg viewBox={`-4 -8 ${W + 8} ${H + 12}`} className="mt-2 block h-auto w-full overflow-visible" role="img" aria-label={`Score rising from ${values[0]} to ${values[values.length - 1]} over six months.`}>
        {[0.33, 0.66].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--border)" strokeDasharray="3 4" />
        ))}
        <motion.path d={area} fill="var(--fund-soft)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1 }} />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--fund)"
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
          r="4.5"
          fill="var(--tech)"
          stroke="var(--surface)"
          strokeWidth="2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
        />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[11px] tracking-[-0.03em] text-fg-muted tabular">
        {SCORE_HISTORY.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}
