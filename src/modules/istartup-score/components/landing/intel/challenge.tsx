'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

import { cn } from '@/lib/utils';
import { useMediaQuery } from '../use-media-query';
import { DIMENSIONS, toneFor } from './data';
import { ConnectionPath, IllustrativeTag, ScoreRing, SectionHeading, VIEW, r2, useTiming, wrap } from './primitives';

/**
 * Scattered → structured. The five dimensions start as loose, tilted blocks; as the
 * section arrives they settle into place, connect to one central picture, and show
 * their indicators. Phones get their own, taller arrangement rather than a shrunk one.
 */

type Layout = { w: number; h: number; hub: { x: number; y: number; r: number }; bw: number; bh: number; blocks: { x: number; y: number }[] };

const WIDE: Layout = {
  w: 600,
  h: 400,
  hub: { x: 300, y: 200, r: 62 },
  bw: 156,
  bh: 60,
  blocks: [
    { x: 16, y: 34 },
    { x: 428, y: 92 },
    { x: 16, y: 170 },
    { x: 428, y: 248 },
    { x: 16, y: 306 },
  ],
};

const NARROW: Layout = {
  w: 340,
  h: 470,
  hub: { x: 170, y: 235, r: 60 },
  bw: 158,
  bh: 58,
  blocks: [
    { x: 0, y: 8 },
    { x: 182, y: 8 },
    { x: 91, y: 404 },
    { x: 0, y: 330 },
    { x: 182, y: 330 },
  ],
};

// Where each block starts: offset and tilted, as if not yet part of one picture.
const SCATTER = [
  { x: -26, y: -18, rotate: -9 },
  { x: 30, y: -24, rotate: 7 },
  { x: -34, y: 10, rotate: 5 },
  { x: 22, y: 28, rotate: -6 },
  { x: -14, y: 30, rotate: 8 },
];

export function Challenge() {
  return (
    <section id="challenge" aria-labelledby="challenge-title" className="bi-y scroll-mt-16 bg-mist">
      <div className={cn(wrap, 'grid items-center gap-x-12 gap-y-12 lg:grid-cols-12')}>
        <div className="lg:col-span-5">
          <SectionHeading
            id="challenge-title"
            eyebrow="The business challenge"
            title="Growth starts with knowing where you stand."
            lead="Every startup has strengths, blind spots, and opportunities to improve. A structured assessment helps turn scattered information into a clearer picture of business readiness."
          />
          <dl className="mt-8 grid max-w-[30rem] gap-4 sm:grid-cols-2">
            <div className="border-l-2 border-line-strong pl-4">
              <dt className="text-[14px] font-semibold text-ink">Before</dt>
              <dd className="mt-1 text-[14px] leading-relaxed text-mut">Signals spread across decks, metrics and gut feel.</dd>
            </div>
            <div className="border-l-2 border-mint pl-4">
              <dt className="text-[14px] font-semibold text-ink">After</dt>
              <dd className="mt-1 text-[14px] leading-relaxed text-mut">Five dimensions, measured the same way, in one view.</dd>
            </div>
          </dl>
        </div>
        <div className="lg:col-span-7">
          <Structure />
        </div>
      </div>
    </section>
  );
}

function Structure() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, VIEW);
  const narrow = useMediaQuery('(max-width: 639px)');
  const L = narrow ? NARROW : WIDE;
  const t = useTiming();

  return (
    <div ref={ref} className="mx-auto w-full max-w-[620px]">
      <svg
        role="img"
        aria-labelledby="structure-title"
        viewBox={`0 0 ${L.w} ${L.h}`}
        className="h-auto w-full overflow-visible"
      >
        <title id="structure-title">
          Five business dimensions — Management, Momentum, Business Model, Motivation and Market — connecting into one
          picture of readiness.
        </title>

        {/* Connections draw once the blocks have settled. */}
        {L.blocks.map((b, i) => {
          const left = b.x + L.bw / 2 < L.hub.x;
          const ax = left ? b.x + L.bw : b.x;
          const ay = b.y + L.bh / 2;
          const ang = Math.atan2(ay - L.hub.y, ax - L.hub.x);
          const hx = r2(L.hub.x + Math.cos(ang) * (L.hub.r + 6));
          const hy = r2(L.hub.y + Math.sin(ang) * (L.hub.r + 6));
          const vertical = narrow && Math.abs(ay - L.hub.y) > Math.abs(ax - L.hub.x);
          const sx = vertical ? b.x + L.bw / 2 : ax;
          const sy = vertical ? (ay < L.hub.y ? b.y + L.bh : b.y) : ay;
          const d = vertical
            ? `M ${sx} ${sy} C ${sx} ${r2((sy + hy) / 2)}, ${hx} ${r2((sy + hy) / 2)}, ${hx} ${hy}`
            : `M ${sx} ${sy} C ${r2((sx + hx) / 2)} ${sy}, ${r2((sx + hx) / 2)} ${hy}, ${hx} ${hy}`;
          return (
            <ConnectionPath
              key={i}
              d={d}
              tone={toneFor(DIMENSIONS[i].level) === 'amber' ? 'amber' : 'mint'}
              width={1.75}
              on={on}
              delay={0.9 + i * 0.1}
            />
          );
        })}

        {/* The central picture. */}
        <motion.g
          initial={{ opacity: 0, scale: 0.85 }}
          animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
          transition={t(0.6, 0.6)}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <circle cx={L.hub.x} cy={L.hub.y + 5} r={L.hub.r} fill="rgba(11,23,48,0.08)" style={{ filter: 'blur(8px)' }} />
          <circle cx={L.hub.x} cy={L.hub.y} r={L.hub.r} fill="var(--paper)" stroke="var(--line)" />
        </motion.g>
        <ScoreRing cx={L.hub.x} cy={L.hub.y} r={L.hub.r - 12} value={1} width={5} stroke="var(--funder)" track="var(--funder-soft)" on={on} delay={1.4} duration={1} />
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: on ? 1 : 0 }} transition={t(1.2, 0.5)}>
          <text x={L.hub.x} y={L.hub.y - 3} textAnchor="middle" fontSize={12.5} fontWeight={650} fill="var(--ink)">
            One picture
          </text>
          <text x={L.hub.x} y={L.hub.y + 14} textAnchor="middle" fontSize={11} fill="var(--mut)">
            of readiness
          </text>
        </motion.g>

        {/* The dimensions: scattered, then in place. */}
        {L.blocks.map((b, i) => {
          const d = DIMENSIONS[i];
          const tone = toneFor(d.level);
          return (
            <motion.g
              key={d.key}
              initial={{ ...SCATTER[i], opacity: 0.35 }}
              animate={on ? { x: 0, y: 0, rotate: 0, opacity: 1 } : { ...SCATTER[i], opacity: 0.35 }}
              transition={t(0.1 + i * 0.07, 0.9)}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              <rect x={b.x} y={b.y} width={L.bw} height={L.bh} rx={12} fill="var(--paper)" stroke="var(--line)" />
              <text x={b.x + 14} y={b.y + 24} fontSize={13} fontWeight={600} fill="var(--ink)">
                {d.title}
              </text>
              <text x={b.x + L.bw - 14} y={b.y + 24} fontSize={11} textAnchor="end" fill="var(--mut)">
                {Math.round(d.weight * 100)}%
              </text>
              {/* Indicator: appears once the block is part of the picture. */}
              <rect x={b.x + 14} y={b.y + 36} width={L.bw - 28} height={5} rx={2.5} fill="var(--mist)" />
              <motion.rect
                x={b.x + 14}
                y={b.y + 36}
                height={5}
                rx={2.5}
                fill={tone === 'amber' ? 'var(--amber)' : 'var(--mint)'}
                initial={{ width: 0 }}
                animate={{ width: on ? r2(((L.bw - 28) * d.percent) / 100) : 0 }}
                transition={t(1.3 + i * 0.08, 0.7)}
              />
            </motion.g>
          );
        })}
      </svg>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <IllustrativeTag />
        <p className="bi-data text-mut">Percentages beside each name are the dimension&apos;s weight in the score.</p>
      </div>
    </div>
  );
}
