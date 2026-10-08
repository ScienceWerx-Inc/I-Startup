'use client';

import { motion } from 'framer-motion';

import { EASE_OUT } from '@/components/reveal';
import { cn } from '@/lib/utils';

import type { Dimension } from './data';

const VB_W = 340;
const VB_H = 262;
const CX = 170;
const CY = 136;
const R = 86;
const LABEL_R = 108;
const RINGS = [0.25, 0.5, 0.75, 1];

type RadarChartProps = {
  dimensions: Dimension[];
  /** Pointer is over the chart's card: points grow and the shape brightens. */
  active?: boolean;
  className?: string;
};

/** A compact pentagon radar of dimension percentages, drawn in on mount. */
export function RadarChart({ dimensions, active = false, className }: RadarChartProps) {
  const n = dimensions.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  // Rounded so server and client render identical attribute strings.
  const at = (i: number, r: number): [number, number] => [
    Math.round((CX + r * Math.cos(angle(i))) * 100) / 100,
    Math.round((CY + r * Math.sin(angle(i))) * 100) / 100,
  ];
  const poly = (pts: [number, number][]) => pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  const ring = (f: number) => poly(dimensions.map((_, i) => at(i, R * f)));
  const profile = dimensions.map((d, i) => at(i, (R * d.percent) / 100));

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={cn('block h-auto w-full', className)}
      role="img"
      aria-label={`Radar chart: ${dimensions.map((d) => `${d.title} ${d.percent}%`).join(', ')}.`}
    >
      {RINGS.map((f) => (
        <polygon key={f} points={ring(f)} fill={f === 1 ? 'var(--surface)' : 'none'} stroke="var(--border-strong)" />
      ))}
      {dimensions.map((d, i) => {
        const [x, y] = at(i, R);
        return <line key={d.key} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--border-strong)" />;
      })}

      <motion.polygon
        points={poly(profile)}
        fill="var(--tech)"
        stroke="var(--tech)"
        strokeWidth="2"
        strokeLinejoin="round"
        initial={{ pathLength: 0, fillOpacity: 0 }}
        animate={{ pathLength: 1, fillOpacity: active ? 0.3 : 0.18 }}
        transition={{ pathLength: { duration: 1.1, ease: EASE_OUT, delay: 0.4 }, fillOpacity: { duration: 0.4 } }}
      />

      {dimensions.map((d, i) => {
        const [px, py] = profile[i];
        const [lx, ly] = at(i, LABEL_R);
        const anchor = lx > CX + 8 ? 'start' : lx < CX - 8 ? 'end' : 'middle';
        const upper = ly < CY;
        return (
          <g key={d.key}>
            <motion.circle
              cx={px}
              cy={py}
              fill={d.color}
              stroke="var(--text)"
              strokeWidth="1.5"
              initial={{ r: 0 }}
              animate={{ r: active ? 5.5 : 4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: active ? i * 0.04 : 0.6 + i * 0.08 }}
            />
            <text x={lx} y={upper ? ly - 12 : ly + 6} textAnchor={anchor} fontSize="11" fill="var(--text-muted)" className="font-sans">
              {d.title}
            </text>
            <text x={lx} y={upper ? ly + 3 : ly + 21} textAnchor={anchor} fontSize="12.5" fontWeight="650" fill="var(--text)" className="font-sans tabular">
              {d.percent}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
