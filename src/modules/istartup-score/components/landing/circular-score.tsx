'use client';

import { motion } from 'framer-motion';

import { EASE_OUT } from '@/components/reveal';
import { cn } from '@/lib/utils';

import type { CategoryKey } from '../../assessment/bank';
import { type Dimension, MAX_SCORE, SAMPLE_BAND, SAMPLE_SCORE } from './data';

const CX = 200;
const CY = 200;
const R = 148;
const STROKE = 22;
const GAP = 3; // degrees between segments
const LABEL_R = 186;

const rad = (deg: number) => (deg * Math.PI) / 180;
/** Rounded so server and client render identical attribute strings. */
const round = (n: number) => Math.round(n * 100) / 100;
const pt = (deg: number, r: number): [number, number] => [round(CX + r * Math.cos(rad(deg))), round(CY + r * Math.sin(rad(deg)))];
const arc = (a0: number, a1: number, r: number) => {
  const [x0, y0] = pt(a0, r);
  const [x1, y1] = pt(a1, r);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);

type CircularScoreProps = {
  dimensions: Dimension[];
  active: CategoryKey | null;
  onActive: (key: CategoryKey | null) => void;
  className?: string;
};

/**
 * A segmented score ring. Each dimension owns an arc sized by its weight in the score;
 * the arc fills to the dimension's percentage. Segments draw in on first view, and the
 * active dimension thickens while the others recede.
 */
export function CircularScore({ dimensions, active, onActive, className }: CircularScoreProps) {
  const usable = 360 - GAP * dimensions.length;
  const segments = dimensions.map((d, i) => {
    const span = d.weight * usable;
    const before = dimensions.slice(0, i).reduce((sum, p) => sum + p.weight * usable + GAP, 0);
    const start = -90 + GAP / 2 + before;
    return { ...d, start, end: start + span, mid: start + span / 2 };
  });

  return (
    <motion.svg
      viewBox="-20 -20 440 440"
      className={cn('block h-auto w-full', className)}
      role="img"
      aria-label={`Score ring: ${SAMPLE_SCORE} out of ${MAX_SCORE}. ${dimensions.map((d) => `${d.title} ${d.percent}%, weight ${Math.round(d.weight * 100)}%`).join('; ')}.`}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.4 }}
    >
      {TICKS.map((deg) => {
        const [x0, y0] = pt(deg, 114);
        const [x1, y1] = pt(deg, deg % 30 === 0 ? 122 : 118);
        return <line key={deg} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--border-strong)" strokeWidth="1" />;
      })}

      {segments.map((s, i) => {
        const isActive = active === s.key;
        const dimmed = active !== null && !isActive;
        const [lx, ly] = pt(s.mid, LABEL_R);
        const anchor = lx > CX + 12 ? 'start' : lx < CX - 12 ? 'end' : 'middle';
        return (
          <g
            key={s.key}
            onMouseEnter={() => onActive(s.key)}
            onMouseLeave={() => onActive(null)}
            style={{ opacity: dimmed ? 0.35 : 1, transition: 'opacity 200ms' }}
          >
            <path d={arc(s.start, s.end, R)} fill="none" stroke={s.color} strokeOpacity="0.14" strokeWidth={STROKE} />
            <motion.path
              d={arc(s.start, s.end, R)}
              fill="none"
              stroke={s.color}
              strokeWidth={isActive ? STROKE + 8 : STROKE}
              style={{ transition: 'stroke-width 200ms' }}
              variants={{ hidden: { pathLength: 0 }, shown: { pathLength: s.percent / 100 } }}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.15 + i * 0.12 }}
            />
            <motion.text
              x={lx}
              y={ly + 4}
              textAnchor={anchor}
              fontSize="13"
              fontWeight="700"
              fill="var(--text)"
              className="font-sans tabular"
              variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.12 }}
            >
              {s.percent}%
            </motion.text>
          </g>
        );
      })}

      <text x={CX} y={CY + 6} textAnchor="middle" fontSize="104" fontWeight="700" letterSpacing="-3" fill="var(--text)" className="font-display tabular">
        {SAMPLE_SCORE}
      </text>
      <text x={CX} y={CY + 34} textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--text-muted)" className="font-display tabular">
        / {MAX_SCORE}
      </text>
      <text x={CX} y={CY + 60} textAnchor="middle" fontSize="13" fontWeight="500" fill="var(--text)" className="font-sans">
        {SAMPLE_BAND}
      </text>
    </motion.svg>
  );
}
