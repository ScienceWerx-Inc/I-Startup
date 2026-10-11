'use client';

import { useEffect, useState, type PointerEvent } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring, useTransform } from 'framer-motion';

import { cn } from '@/lib/utils';
import { useMediaQuery, useRichPointer } from '../use-media-query';
import {
  DIMENSIONS,
  DIMENSION_COUNT,
  FOCUS_ACTION,
  MAX_SCORE,
  QUESTION_COUNT,
  SAMPLE_ACTIONS,
  SAMPLE_BAND,
  SAMPLE_SCORE,
  WEAKEST,
  toneFor,
} from './data';
import {
  AssessmentMarker,
  ConnectionPath,
  DataNode,
  EASE,
  GuideRings,
  IllustrativeTag,
  MetricLabel,
  ProgressIndicator,
  ScoreRing,
  arc,
  polar,
  r2,
  useDelay,
  useTiming,
} from './primitives';

/**
 * The Assessment Engine: one startup, evaluated across the five real dimensions.
 *
 * Each dimension owns a slice of the outer ring sized by its weight in the score, and
 * fills it by its result. The score ring in the middle is their weighted sum. Around
 * it, the dimensions as nodes; below, the breakdown and the first priority action.
 * All values are the example startup's, computed by the product's own scoring.
 *
 * Sequence (s): guides 0 → nodes and paths 0.3 → score ring 0.9, count 1.0 → inner
 * ring and markers 1.3 → breakdown 1.6, one dimension at a time from 2.1 →
 * recommendation 2.5. Then only a slow orbit, a sweep on the ring, one pulse and a
 * few pixels of drift. Reduced motion renders the finished state.
 */

const W = 680;
const H = 700;
const CX = 340;
const CY = 232;
const NODE_R = 172;
const GAP = 4; // degrees between dimension arcs

const SLICES = (() => {
  let at = 0;
  return DIMENSIONS.map((d) => {
    const span = d.weight * 360;
    const slice = { ...d, from: at + GAP / 2, to: at + span - GAP / 2, mid: at + span / 2 };
    at += span;
    return slice;
  });
})();

const WEAKEST_INDEX = DIMENSIONS.findIndex((d) => d.key === WEAKEST.key);
const NODE_TONE = { mint: 'mint', amber: 'amber' } as const;

export function AssessmentEngine({ className }: { className?: string }) {
  const t = useTiming();
  const reduce = useReducedMotion();
  const rich = useRichPointer();
  // Phones get the ring alone, cropped close; the panels follow below it in the flow.
  const small = useMediaQuery('(max-width: 639px)');
  const viewBox = small ? `${CX - 150} ${CY - 150} 300 300` : `0 0 ${W} ${H}`;
  const [on, setOn] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  // Start on mount; walk the breakdown one dimension at a time, then settle on the one
  // the recommendation is about.
  useEffect(() => {
    const start = requestAnimationFrame(() => setOn(true));
    const steps = reduce ? [] : DIMENSIONS.map((_, i) => 2100 + i * 380);
    const timers = steps.map((ms, i) => window.setTimeout(() => setHighlight(i), ms));
    timers.push(window.setTimeout(() => setHighlight(WEAKEST_INDEX), reduce ? 0 : 2100 + DIMENSIONS.length * 380));
    return () => {
      cancelAnimationFrame(start);
      timers.forEach(clearTimeout);
    };
  }, [reduce]);

  // The score counts up once the ring has started drawing.
  const count = useMotionValue(0);
  useMotionValueEvent(count, 'change', (v) => setScore(Math.round(v)));
  useEffect(() => {
    if (!on) return;
    const controls = animate(count, SAMPLE_SCORE, reduce ? { duration: 0 } : { delay: 1.0, duration: 1.3, ease: EASE });
    return () => controls.stop();
  }, [on, reduce, count]);

  // Pointer parallax: back layers move least. Desktop with a fine pointer only.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 60, damping: 18, mass: 0.6 });
  const backX = useTransform(sx, (v) => v * -5);
  const backY = useTransform(sy, (v) => v * -5);
  const coreX = useTransform(sx, (v) => v * -9);
  const coreY = useTransform(sy, (v) => v * -9);
  const frontX = useTransform(sx, (v) => v * 12);
  const frontY = useTransform(sy, (v) => v * 12);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!rich) return;
    const box = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - box.left) / box.width) * 2 - 1);
    py.set(((e.clientY - box.top) / box.height) * 2 - 1);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div className={cn('relative', className)} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className={cn('relative mx-auto w-full', small ? 'aspect-square max-w-[340px]' : 'aspect-[680/700]')}>
        {/* Back: guides and the slow orbit. */}
        <motion.svg
          aria-hidden
          viewBox={viewBox}
          className="absolute inset-0 h-full w-full"
          style={{ x: backX, y: backY }}
        >
          <GuideRings cx={CX} cy={CY} radii={[152, 198, 232]} ticks={72} on={on} />
          <g className="bi-orbit" style={{ transformOrigin: `${CX}px ${CY}px`, ['--bi-orbit' as string]: '36s' }}>
            <circle cx={CX} cy={CY - 198} r={3.5} fill="var(--funder)" opacity={0.5} />
            <circle cx={CX} cy={CY + 198} r={2.5} fill="var(--mint)" />
          </g>
          <g className="bi-orbit" style={{ transformOrigin: `${CX}px ${CY}px`, ['--bi-orbit' as string]: '52s', animationDirection: 'reverse' }}>
            <circle cx={CX + 152} cy={CY} r={2.5} fill="var(--line-strong)" />
          </g>
        </motion.svg>

        {/* Core: rings, nodes, paths. */}
        <motion.svg
          role="img"
          aria-labelledby="engine-title engine-desc"
          viewBox={viewBox}
          className="absolute inset-0 h-full w-full overflow-visible"
          style={{ x: coreX, y: coreY }}
        >
          <title id="engine-title">Illustrative assessment of an example startup</title>
          <desc id="engine-desc">
            {`A score ring showing ${SAMPLE_SCORE} out of ${MAX_SCORE}, rated ${SAMPLE_BAND}, built from five weighted dimensions: ${DIMENSIONS.map((d) => `${d.title} ${d.percent}%`).join(', ')}.`}
          </desc>
          <defs>
            <linearGradient id="engine-score" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--mint)" />
              <stop offset="1" stopColor="var(--teal)" />
            </linearGradient>
            <linearGradient id="engine-sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.75" />
            </linearGradient>
            <radialGradient id="engine-core" cx="0.5" cy="0.42" r="0.6">
              <stop offset="0" stopColor="#fff" />
              <stop offset="1" stopColor="var(--mist)" />
            </radialGradient>
          </defs>

          <g className="max-sm:hidden">
          {/* Connections: from each dimension's slice out to its node. */}
          {SLICES.map((s, i) => {
            const a = polar(CX, CY, 136, s.mid);
            const c = polar(CX, CY, NODE_R - 16, s.mid + 9);
            const b = polar(CX, CY, NODE_R - 6, s.mid);
            const tone = toneFor(s.level);
            return (
              <ConnectionPath
                key={s.key}
                d={`M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`}
                tone={highlight === i ? NODE_TONE[tone] : 'neutral'}
                width={highlight === i ? 2.25 : 1.5}
                on={on}
                delay={0.35 + i * 0.08}
              />
            );
          })}

          </g>

          {/* The core disc, lifted by a soft shadow. */}
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: on ? 1 : 0 }} transition={t(0.5, 0.6)}>
            <circle cx={CX} cy={CY + 6} r={116} fill="rgba(11,23,48,0.07)" style={{ filter: 'blur(10px)' }} />
            <circle cx={CX} cy={CY} r={116} fill="url(#engine-core)" stroke="var(--line)" />
          </motion.g>

          {/* Outer ring: one slice per dimension, sized by weight, filled by result. */}
          {SLICES.map((s, i) => {
            const fillTo = r2(s.from + (s.to - s.from) * (s.percent / 100));
            return (
              <g key={s.key}>
                <path d={arc(CX, CY, 130, s.from, s.to)} fill="none" stroke="var(--funder-soft)" strokeWidth={6} strokeLinecap="round" />
                <motion.path
                  d={arc(CX, CY, 130, s.from, fillTo)}
                  fill="none"
                  stroke={highlight === i ? (toneFor(s.level) === 'amber' ? 'var(--amber)' : 'var(--mint)') : 'var(--funder)'}
                  strokeWidth={6}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: on ? 1 : 0 }}
                  transition={t(1.3 + i * 0.07, 0.7)}
                  style={{ transition: 'stroke 300ms' }}
                />
              </g>
            );
          })}

          {/* Score ring. */}
          <ScoreRing cx={CX} cy={CY} r={100} value={SAMPLE_SCORE / MAX_SCORE} width={12} stroke="url(#engine-score)" on={on} delay={0.9} />
          <circle cx={CX} cy={CY} r={82} fill="none" stroke="var(--line)" strokeDasharray="1 5" />

          {/* A highlight that travels slowly around the score ring. */}
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: on ? 1 : 0 }} transition={t(2.6, 0.8)}>
            <g className="bi-orbit" style={{ transformOrigin: `${CX}px ${CY}px`, ['--bi-orbit' as string]: '10s' }}>
              <path d={arc(CX, CY, 100, 0, 28)} fill="none" stroke="url(#engine-sweep)" strokeWidth={12} strokeLinecap="round" opacity={0.6} />
            </g>
          </motion.g>

          {SLICES.map((s, i) => (
            <AssessmentMarker key={s.key} cx={CX} cy={CY} r={130} deg={s.from - GAP / 2} tone="neutral" on={on} delay={1.3 + i * 0.05} />
          ))}

          {/* The number. */}
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: on ? 1 : 0 }} transition={t(1.0, 0.5)}>
            <text x={CX} y={CY - 26} textAnchor="middle" fontSize={11} fontWeight={600} letterSpacing="0.08em" fill="var(--mut)">
              ISTARTUP SCORE
            </text>
            <text
              x={CX}
              y={CY + 18}
              textAnchor="middle"
              fontSize={50}
              fontWeight={650}
              letterSpacing="-0.03em"
              fill="var(--ink)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {score}
            </text>
            <text x={CX} y={CY + 40} textAnchor="middle" fontSize={12.5} fill="var(--mut)">
              {`out of ${MAX_SCORE}`}
            </text>
          </motion.g>
          <motion.g initial={{ opacity: 0, y: 4 }} animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }} transition={t(2.2, 0.5)}>
            <rect x={CX - 62} y={CY + 52} width={124} height={22} rx={11} fill="var(--mint-soft)" />
            <text x={CX} y={CY + 67} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="var(--mint-ink)">
              {SAMPLE_BAND}
            </text>
          </motion.g>

          {/* Dimension nodes and their names. */}
          <g className="max-sm:hidden">
          {SLICES.map((s, i) => {
            const p = polar(CX, CY, NODE_R, s.mid);
            const right = p.x >= CX;
            const tone = toneFor(s.level);
            return (
              <g key={s.key}>
                <DataNode
                  x={p.x}
                  y={p.y}
                  r={highlight === i ? 7 : 5.5}
                  tone={highlight === i ? NODE_TONE[tone] : 'funder'}
                  pulse={i === WEAKEST_INDEX}
                  on={on}
                  delay={0.3 + i * 0.08}
                />
                <motion.text
                  x={right ? p.x + 14 : p.x - 14}
                  y={p.y + 4}
                  textAnchor={right ? 'start' : 'end'}
                  fontSize={12.5}
                  fontWeight={highlight === i ? 650 : 500}
                  fill={highlight === i ? 'var(--ink)' : 'var(--mut)'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: on ? 1 : 0 }}
                  transition={t(0.5 + i * 0.08, 0.4)}
                >
                  {s.title}
                </motion.text>
              </g>
            );
          })}

          </g>

          {/* Floating facts about the assessment itself (not about any startup). */}
          <g className="max-sm:hidden">
            <MetricLabel x={18} y={36} w={150} label="Questions" value={`${QUESTION_COUNT}`} on={on} delay={0.6} />
            <MetricLabel x={512} y={22} w={150} label="Dimensions" value={`${DIMENSION_COUNT}`} on={on} delay={0.7} />
            <MetricLabel x={526} y={360} w={136} label="Priority actions" value={`${SAMPLE_ACTIONS.length}`} tone="mint" on={on} delay={2.4} />
          </g>
        </motion.svg>

        {/* Front: the interface panels. */}
        <motion.div className="absolute inset-0 hidden sm:block" style={{ x: frontX, y: frontY }}>
          <motion.div
            className="absolute bottom-0 left-0 w-[47%]"
            initial={{ opacity: 0, y: 18 }}
            animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={t(1.6, 0.6)}
          >
            <BreakdownPanel on={on} highlight={highlight} className="bi-drift" />
          </motion.div>

          <motion.div
            className="absolute bottom-[5%] right-0 w-[50%]"
            initial={{ opacity: 0, y: 18 }}
            animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={t(2.5, 0.6)}
          >
            <RecommendationCard on={on} className="bi-drift" />
          </motion.div>
        </motion.div>

        <IllustrativeTag className="absolute right-0 top-[-2%] hidden sm:inline-flex" />
      </div>

      {/* Phones: the recommendation sits below the visual instead of over it. */}
      <div className="mt-4 grid gap-3 sm:hidden">
        <BreakdownPanel on={on} highlight={highlight} />
        <RecommendationCard on={on} />
        <IllustrativeTag className="justify-self-start" />
      </div>
    </div>
  );
}

function RecommendationCard({ on, className }: { on: boolean; className?: string }) {
  const t = useTiming();
  const delay = useDelay();
  return (
    <div
      className={cn('relative overflow-hidden rounded-card border border-line bg-surface p-4 shadow-float', className)}
      style={{ ['--bi-drift' as string]: '11s', ['--bi-drift-y' as string]: '-3px' }}
    >
      <motion.span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] origin-top bg-gradient-to-b from-mint to-teal"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: on ? 1 : 0 }}
        transition={t(2.9, 0.7)}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="bi-data font-semibold text-ink">Priority action</span>
        <span className="bi-data text-mut">1 of {SAMPLE_ACTIONS.length}</span>
      </div>
      <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-2 py-0.5 text-[11.5px] font-semibold text-amber-ink">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber" />
        {FOCUS_ACTION.dimension} · {FOCUS_ACTION.title}
      </span>
      <p
        className={cn(
          'mt-2.5 rounded-lg px-2 py-1.5 text-[13px] leading-snug text-ink transition-colors duration-700',
          on ? 'bg-mint-soft' : 'bg-transparent',
        )}
        style={delay(3.0)}
      >
        {FOCUS_ACTION.action}
      </p>
      <p className="bi-data mt-2 text-mut">
        Up to <span className="font-semibold text-mint-ink">+{FOCUS_ACTION.points} pts</span> if fully addressed
      </p>
    </div>
  );
}

function BreakdownPanel({ on, highlight, className }: { on: boolean; highlight: number | null; className?: string }) {
  return (
    <div className={cn('rounded-card border border-line bg-surface p-4 shadow-float', className)} style={{ ['--bi-drift' as string]: '9s' }}>
      <p className="bi-data font-semibold text-ink">Score by dimension</p>
      <div className="mt-1.5 grid">
        {DIMENSIONS.map((d, i) => (
          <ProgressIndicator
            key={d.key}
            label={d.title}
            value={d.percent}
            tone={toneFor(d.level)}
            highlight={highlight === i}
            compact
            on={on}
            delay={1.75 + i * 0.08}
          />
        ))}
      </div>
    </div>
  );
}
