'use client';

import { motion } from 'framer-motion';

import { DIMENSIONS, toneFor, type CategoryKey } from './data';
import { polar, useTiming } from './primitives';

/**
 * The five dimensions as a radar: guides at 25/50/75/100%, an outline that draws
 * itself, an area that grows from the centre, and one vertex per dimension. A
 * dimension can be highlighted (hover or focus elsewhere sets `active`).
 */
export function Radar({
  size = 360,
  radius = 110,
  on,
  delay = 0,
  active,
  labels = true,
  labelSize = 12.5,
  title,
}: {
  size?: number;
  radius?: number;
  on: boolean;
  delay?: number;
  active?: CategoryKey | null;
  labels?: boolean;
  /** In SVG units: raise it when the chart is drawn small. */
  labelSize?: number;
  title: string;
}) {
  const t = useTiming();
  const w = size;
  const h = labels ? size * 0.9 : size * 0.8;
  const cx = w / 2;
  const cy = labels ? h / 2 + 6 : h / 2 + 4;
  const step = 360 / DIMENSIONS.length;
  const at = (i: number, pct: number) => polar(cx, cy, (radius * pct) / 100, i * step);
  const points = DIMENSIONS.map((d, i) => at(i, d.percent));
  const outline = `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;

  return (
    <svg role="img" aria-label={title} viewBox={`0 0 ${w} ${h}`} className="h-auto w-full overflow-visible">
      {/* Guides */}
      {[25, 50, 75, 100].map((pct) => (
        <polygon
          key={pct}
          points={DIMENSIONS.map((_, i) => {
            const p = at(i, pct);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill={pct === 100 ? 'var(--paper)' : 'none'}
          stroke="var(--line)"
          strokeDasharray={pct === 100 ? undefined : '2 4'}
        />
      ))}
      {DIMENSIONS.map((d, i) => {
        const p = at(i, 100);
        return <line key={d.key} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--line)" />;
      })}

      {/* Area grows from the centre, the outline draws over it. */}
      <motion.path
        d={outline}
        fill="var(--funder)"
        fillOpacity={0.12}
        initial={{ scale: 0, opacity: 0 }}
        animate={on ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={t(delay + 0.2, 0.9)}
        style={{ transformBox: 'view-box', transformOrigin: `${cx}px ${cy}px` }}
      />
      <motion.path
        d={outline}
        fill="none"
        stroke="var(--funder)"
        strokeWidth={2}
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: on ? 1 : 0 }}
        transition={t(delay + 0.3, 1.1)}
      />

      {DIMENSIONS.map((d, i) => {
        const p = points[i];
        const tone = toneFor(d.level);
        const isActive = active === d.key;
        const l = at(i, 100 + (labels ? 22 : 0));
        const anchor = Math.abs(l.x - cx) < 8 ? 'middle' : l.x > cx ? 'start' : 'end';
        return (
          <g key={d.key}>
            <motion.circle
              cx={p.x}
              cy={p.y}
              r={isActive ? 7 : 5}
              fill={tone === 'amber' ? 'var(--amber)' : 'var(--mint)'}
              stroke="var(--paper)"
              strokeWidth={2.5}
              initial={{ opacity: 0 }}
              animate={{ opacity: on ? 1 : 0 }}
              transition={t(delay + 0.9 + i * 0.07, 0.3)}
              style={{ transition: 'r 200ms' }}
            />
            {labels && (
              <motion.text
                x={l.x}
                y={l.y + 4}
                textAnchor={anchor}
                fontSize={labelSize}
                fontWeight={isActive ? 650 : 500}
                fill={isActive ? 'var(--ink)' : 'var(--mut)'}
                initial={{ opacity: 0 }}
                animate={{ opacity: on ? 1 : 0 }}
                transition={t(delay + 1 + i * 0.07, 0.4)}
              >
                {d.title}
              </motion.text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
