'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { FileSearch, Layers, Scale } from 'lucide-react';

import { cn } from '@/lib/utils';
import { DIMENSIONS, FOCUS_ACTION, MAX_SCORE, OTHER_APPLICANTS, QUESTION_COUNT, SAMPLE_BAND, SAMPLE_SCORE, toneFor } from './data';
import {
  Accent,
  ButtonLink,
  ConnectionPath,
  DataNode,
  IllustrativeTag,
  ProgressIndicator,
  REVIEWER_HREF,
  SectionHeading,
  VIEW,
  r2,
  useTiming,
  wrap,
} from './primitives';

/**
 * The opportunity network. Applicants as nodes, each with a compact assessment card;
 * one becomes the focus and its full report slides in. The tone is institutional:
 * navy, muted blue, thin lines, one mint path for the selection. It suggests a way to
 * read results side by side — not approval, returns or risk prediction.
 */

const POINTS = [
  { icon: Scale, title: 'Like-for-like results', body: `Every startup answers the same ${QUESTION_COUNT} questions, scored the same way.` },
  { icon: Layers, title: 'Readiness by dimension', body: 'Scores per dimension, with strengths and gaps in plain language.' },
  { icon: FileSearch, title: 'Tied to the application', body: 'A completed report is archived with the application it was linked to.' },
];

const W = 640;
const H = 460;

const NODES = [
  { x: 40, y: 64 },
  { x: 112, y: 132 },
  { x: 46, y: 222 },
  { x: 120, y: 296 },
  { x: 44, y: 384 },
  { x: 134, y: 420 },
];
const MESH: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [1, 3]];

const CARD = { x: 190, w: 150, h: 70 };
const APPLICANTS = [
  { name: 'Applicant A', y: 36, bars: OTHER_APPLICANTS[0], from: [0, 1] },
  { name: 'Applicant B', y: 190, bars: DIMENSIONS.map((d) => d.percent), from: [1, 2, 3], selected: true },
  { name: 'Applicant C', y: 344, bars: OTHER_APPLICANTS[1], from: [3, 4, 5] },
];

// The report panel's left edge and anchor height, in the same units as the SVG.
const PANEL_X = r2(W * 0.56);
const PANEL_Y = r2(H * 0.06 + 64);

export function Funders() {
  return (
    <section id="funders" aria-labelledby="funders-title" className="bi-y bi-canvas-dark relative scroll-mt-16 overflow-hidden bg-ink text-on-dark">
      <div className={cn(wrap, 'grid items-center gap-x-14 gap-y-12 lg:grid-cols-12')}>
        <div className="lg:col-span-5">
          <SectionHeading
            id="funders-title"
            dark
            eyebrow="For funders"
            title={
              <>
                Evaluate opportunities with <Accent dark>greater confidence.</Accent>
              </>
            }
            lead="Review structured startup assessment results to understand business readiness, identify potential gaps, and support your due diligence process."
          />
          <ul className="mt-8 grid gap-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tile bg-white/[0.06] text-mint">
                  <p.icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span>
                  <h3 className="bi-h3 text-on-dark">{p.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-on-dark-muted">{p.body}</p>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={REVIEWER_HREF} variant="inverse" arrow>
              Reviewer Sign In
            </ButtonLink>
            <ButtonLink href="#how-it-works" variant="outlineDark">
              How It Works
            </ButtonLink>
          </div>
          <p className="mt-4 max-w-[30rem] text-[13px] leading-relaxed text-on-dark-muted">
            A score supports a review; it does not approve funding or predict returns.
          </p>
        </div>

        <div className="lg:col-span-7">
          <Network />
        </div>
      </div>
    </section>
  );
}

function Network() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, VIEW);
  const t = useTiming();
  const selected = APPLICANTS.find((a) => a.selected)!;

  return (
    <div ref={ref}>
      <div className="relative mx-auto aspect-[640/460] w-full max-w-[680px] max-sm:hidden">
        <svg
          role="img"
          aria-labelledby="network-title"
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <title id="network-title">
            Illustrative network of applicants, each with a compact assessment card; one is selected and its report is
            shown in full.
          </title>

          {/* 1. Applicants and the mesh between them */}
          {MESH.map(([a, b], i) => (
            <ConnectionPath
              key={`m${i}`}
              d={`M ${NODES[a].x} ${NODES[a].y} L ${NODES[b].x} ${NODES[b].y}`}
              tone="white"
              width={1}
              dashed
              on={on}
              delay={0.2 + i * 0.05}
              duration={0.6}
            />
          ))}

          {/* 2. Lines from applicants to their assessment cards */}
          {APPLICANTS.flatMap((app, ai) =>
            app.from.map((n, k) => {
              const s = NODES[n];
              const ey = app.y + CARD.h / 2;
              const mx = r2((s.x + CARD.x) / 2);
              return (
                <ConnectionPath
                  key={`c${ai}-${k}`}
                  d={`M ${s.x} ${s.y} C ${mx} ${s.y}, ${mx} ${ey}, ${CARD.x} ${ey}`}
                  tone={app.selected ? 'mint' : 'white'}
                  width={app.selected ? 1.75 : 1}
                  on={on}
                  delay={0.5 + ai * 0.12 + k * 0.05}
                />
              );
            }),
          )}

          {NODES.map((n, i) => (
            <DataNode
              key={i}
              x={n.x}
              y={n.y}
              r={5}
              tone={selected.from.includes(i) ? 'mint' : 'white'}
              ring="var(--ink)"
              on={on}
              delay={0.05 + i * 0.07}
            />
          ))}

          {/* 3. Compact assessment cards */}
          {APPLICANTS.map((app, ai) => (
            <motion.g
              key={app.name}
              initial={{ opacity: 0, x: -10 }}
              animate={on ? { opacity: app.selected ? 1 : 0.7, x: 0 } : { opacity: 0, x: -10 }}
              transition={t(0.8 + ai * 0.12, 0.5)}
            >
              <rect
                x={CARD.x}
                y={app.y}
                width={CARD.w}
                height={CARD.h}
                rx={18}
                fill="rgba(255,255,255,0.07)"
                stroke={app.selected ? 'var(--mint)' : 'rgba(255,255,255,0.16)'}
                strokeWidth={app.selected ? 1.5 : 1}
              />
              <text x={CARD.x + 12} y={app.y + 22} fontSize={12} fontWeight={600} fill="#fff">
                {app.name}
              </text>
              {app.bars.map((v, bi) => {
                const bh = r2((v / 100) * 26);
                return (
                  <motion.rect
                    key={bi}
                    x={CARD.x + 12 + bi * 14}
                    width={8}
                    rx={2}
                    fill={app.selected ? (toneFor(DIMENSIONS[bi].level) === 'amber' ? 'var(--amber)' : 'var(--mint)') : 'rgba(255,255,255,0.35)'}
                    initial={{ y: app.y + 58, height: 0 }}
                    animate={on ? { y: r2(app.y + 58 - bh), height: bh } : { y: app.y + 58, height: 0 }}
                    transition={t(1.0 + ai * 0.12 + bi * 0.04, 0.5)}
                  />
                );
              })}
              {app.selected && (
                <text x={CARD.x + CARD.w - 12} y={app.y + 22} fontSize={11} textAnchor="end" fill="var(--mint)">
                  Selected
                </text>
              )}
            </motion.g>
          ))}

          {/* 4. The focus: from the selected card into the report */}
          <ConnectionPath
            d={`M ${CARD.x + CARD.w} ${selected.y + CARD.h / 2} C ${PANEL_X - 10} ${selected.y + CARD.h / 2}, ${CARD.x + CARD.w + 8} ${PANEL_Y}, ${PANEL_X} ${PANEL_Y}`}
            tone="mint"
            width={2.25}
            on={on}
            delay={1.5}
            duration={0.6}
          />
        </svg>

        <div className="absolute right-0 top-[6%] w-[44%]">
          <ReportPanel on={on} />
        </div>
      </div>

      {/* Phones: the report on its own, with the network reduced to a row of applicants. */}
      <div className="sm:hidden">
        <div aria-hidden className="mb-4 flex items-center gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="flex flex-1 items-center gap-3">
              <span className={cn('h-2.5 w-2.5 rounded-full', i === 1 ? 'bg-mint' : 'bg-white/40')} />
              {i < 4 && <span className="h-px flex-1 bg-white/15" />}
            </span>
          ))}
        </div>
        <ReportPanel on={on} />
      </div>
    </div>
  );
}

function ReportPanel({ on }: { on: boolean }) {
  const t = useTiming();
  return (
    <motion.div
      className="bi-glass-dark rounded-card p-4 sm:p-5"
      initial={{ opacity: 0, x: 24 }}
      animate={on ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
      transition={t(1.7, 0.6)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="bi-data text-on-dark-muted">Assessment report</p>
          <p className="mt-0.5 text-[15px] font-semibold text-on-dark">Applicant B</p>
        </div>
        <IllustrativeTag dark className="shrink-0" />
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-on-dark tabular-nums">{SAMPLE_SCORE}</span>
        <span className="bi-data text-on-dark-muted">/ {MAX_SCORE}</span>
        <span className="bi-data ml-auto rounded-full bg-mint/15 px-2.5 py-1 font-semibold text-mint">{SAMPLE_BAND}</span>
      </div>
      <div className="mt-4 grid border-t border-white/[0.08] pt-3">
        {DIMENSIONS.map((d, i) => (
          <ProgressIndicator
            key={d.key}
            label={d.title}
            value={d.percent}
            tone={toneFor(d.level)}
            compact
            dark
            on={on}
            delay={1.95 + i * 0.07}
          />
        ))}
      </div>
      <p className="bi-data mt-3 border-t border-white/[0.08] pt-3 text-on-dark-muted">
        Top gap: <span className="text-on-dark">{FOCUS_ACTION.dimension} · {FOCUS_ACTION.title}</span>
      </p>
    </motion.div>
  );
}
