'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ILLUSTRATIVE, MAX_SCORE } from './data';
import { usePrefersReducedMotion } from '../use-media-query';

/**
 * The landing page's visual grammar: one easing, one container, one set of buttons and
 * headings, and the SVG pieces every illustration is assembled from — score rings,
 * data nodes, connection paths, metric labels, progress indicators, insight cards.
 */

export const EASE = [0.22, 1, 0.36, 1] as const;
export const wrap = 'mx-auto w-full max-w-[1240px] bi-x';
/** In view once any part clears the bottom eighth of the screen — works for tall blocks on phones too. */
export const VIEW = { once: true, margin: '0px 0px -12% 0px' } as const;

/** Every start CTA goes through the "Submit an idea" onboarding, which creates the account. */
export const ASSESSMENT_HREF = '/start';
/** Where a signed-in founder's assessment lives. */
export const MY_ASSESSMENT_HREF = '/interview';
export const MY_COURSES_HREF = '/learn';
export const SIGN_IN_HREF = '/sign-in';
/** Reviewers read archived reports behind the admin sign-in. */
export const REVIEWER_HREF = '/admin/login';

/**
 * Transition factory. Reduced motion collapses every step to its end state; it is read
 * only inside transitions, which never reach the markup, so hydration stays stable.
 */
export function useTiming() {
  const reduce = useReducedMotion();
  return (delay = 0, duration = 0.5, extra: Transition = {}): Transition =>
    reduce ? { duration: 0, delay: 0 } : { duration, delay, ease: EASE, ...extra };
}

/**
 * For state changes written as classes (colours through theme tokens, which a tween
 * cannot read): the CSS transition delay that lines them up with the sequence.
 */
export function useDelay() {
  // Reaches the markup, so it uses the hydration-safe query: false on the server and
  // during hydration, then the live value.
  const reduce = usePrefersReducedMotion();
  return (seconds: number) => ({ transitionDelay: reduce ? '0s' : `${seconds}s` });
}

/** SVG coordinates rounded to two places, so server and client agree to the digit. */
export const r2 = (n: number) => Math.round(n * 100) / 100;

export function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: r2(cx + r * Math.cos(a)), y: r2(cy + r * Math.sin(a)) };
}

/** An SVG arc from one angle to another, clockwise, 0° at twelve o'clock. */
export function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const s = polar(cx, cy, r, from);
  const e = polar(cx, cy, r, to);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

/* ── Text ─────────────────────────────────────────────────────────────── */

export function Eyebrow({ children, dark = false, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <p className={cn('bi-eyebrow flex items-center gap-3', dark ? 'text-mint' : 'text-funder', className)}>
      <span aria-hidden className={cn('h-[3px] w-6 shrink-0 rounded-full bg-gradient-to-r', dark ? 'from-mint to-teal' : 'from-funder to-mint')} />
      {children}
    </p>
  );
}

/** The phrase in a heading that carries its point, in the accent gradient. */
export function Accent({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <span className={dark ? 'bi-accent-dark' : 'bi-accent'}>{children}</span>;
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  dark = false,
  className,
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <Reveal className={className}>
      {eyebrow && <Eyebrow dark={dark}>{eyebrow}</Eyebrow>}
      <h2 id={id} className={cn('bi-h2 text-balance', eyebrow && 'mt-4', dark ? 'text-on-dark' : 'text-ink')}>
        {title}
      </h2>
      {lead && (
        <p className={cn('bi-lead mt-5 max-w-[38rem] text-pretty', dark ? 'text-on-dark-muted' : 'text-mut')}>{lead}</p>
      )}
    </Reveal>
  );
}

/* ── Actions ──────────────────────────────────────────────────────────── */

const BUTTON = {
  primary: 'bi-btn-primary',
  ink: 'bg-ink text-on-dark hover:bg-midnight',
  secondary: 'border border-line-strong bg-paper text-ink hover:border-ink',
  inverse: 'bg-paper text-ink hover:bg-mist',
  outlineDark: 'border border-white/25 text-on-dark hover:border-white/60 hover:bg-white/5',
} as const;

export function ButtonLink({
  href,
  variant = 'primary',
  arrow = false,
  children,
  className,
}: {
  href: string;
  variant?: keyof typeof BUTTON;
  arrow?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex h-12 items-center justify-center gap-2 rounded-btn px-6 text-[15px] font-semibold tracking-[-0.01em] transition-[background-color,border-color,transform,filter,box-shadow] duration-200 active:translate-y-px',
        BUTTON[variant],
        className,
      )}
    >
      {children}
      {arrow && (
        <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
      )}
    </Link>
  );
}

/* ── Motion ───────────────────────────────────────────────────────────── */

export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const t = useTiming();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEW}
      transition={t(delay, 0.55)}
    >
      {children}
    </motion.div>
  );
}

/* ── Illustration pieces (SVG) ────────────────────────────────────────── */

type Tone = 'mint' | 'funder' | 'ink' | 'amber' | 'neutral' | 'white';

const STROKE: Record<Tone, string> = {
  mint: 'var(--mint)',
  funder: 'var(--funder)',
  ink: 'var(--ink)',
  amber: 'var(--amber)',
  neutral: 'var(--line-strong)',
  white: 'rgba(255,255,255,0.5)',
};

/** A ring that draws from twelve o'clock to `value` (0–1). */
export function ScoreRing({
  cx,
  cy,
  r,
  value,
  width = 10,
  stroke = 'var(--mint)',
  track = 'var(--line)',
  on,
  delay = 0,
  duration = 1.3,
}: {
  cx: number;
  cy: number;
  r: number;
  value: number;
  width?: number;
  stroke?: string;
  track?: string | null;
  on: boolean;
  delay?: number;
  duration?: number;
}) {
  const t = useTiming();
  return (
    <g transform={`rotate(-90 ${cx} ${cy})`}>
      {track && <circle cx={cx} cy={cy} r={r} fill="none" stroke={track} strokeWidth={width} />}
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={on ? { pathLength: value, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={t(delay, duration)}
      />
    </g>
  );
}

/** A curved link between two points of the system. */
export function ConnectionPath({
  d,
  tone = 'neutral',
  width = 1.5,
  dashed = false,
  on,
  delay = 0,
  duration = 0.9,
}: {
  d: string;
  tone?: Tone;
  width?: number;
  dashed?: boolean;
  on: boolean;
  delay?: number;
  duration?: number;
}) {
  const t = useTiming();
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={STROKE[tone]}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={dashed ? '2 5' : undefined}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={on ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
      transition={t(delay, duration)}
    />
  );
}

/** One point of data: a filled dot with a paper ring, optionally pulsing. */
export function DataNode({
  x,
  y,
  r = 6,
  tone = 'funder',
  ring = 'var(--paper)',
  pulse = false,
  on,
  delay = 0,
}: {
  x: number;
  y: number;
  r?: number;
  tone?: Tone;
  ring?: string;
  pulse?: boolean;
  on: boolean;
  delay?: number;
}) {
  const t = useTiming();
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.4 }}
      animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
      transition={t(delay, 0.45)}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {pulse && <circle className="bi-pulse" cx={x} cy={y} r={r} fill={STROKE[tone]} opacity={0} />}
      <circle cx={x} cy={y} r={r + 3} fill={ring} />
      <circle cx={x} cy={y} r={r} fill={STROKE[tone]} />
    </motion.g>
  );
}

/** A compact label card inside an SVG: a name and a value. */
export function MetricLabel({
  x,
  y,
  w = 128,
  label,
  value,
  tone = 'ink',
  dark = false,
  on,
  delay = 0,
}: {
  x: number;
  y: number;
  w?: number;
  label: string;
  value?: string;
  tone?: 'ink' | 'mint' | 'amber';
  dark?: boolean;
  on: boolean;
  delay?: number;
}) {
  const t = useTiming();
  const valueFill = tone === 'mint' ? 'var(--mint-ink)' : tone === 'amber' ? 'var(--amber-ink)' : 'var(--ink)';
  return (
    <motion.g
      initial={{ opacity: 0, y: 6 }}
      animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
      transition={t(delay, 0.45)}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={30}
        rx={15}
        fill={dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)'}
        stroke={dark ? 'rgba(255,255,255,0.16)' : 'rgba(11,23,48,0.08)'}
      />
      <text x={x + 10} y={y + 19.5} fontSize={11.5} fontWeight={500} fill={dark ? 'rgba(255,255,255,0.75)' : 'var(--mut)'}>
        {label}
      </text>
      {value && (
        <text
          x={x + w - 10}
          y={y + 19.5}
          fontSize={12}
          fontWeight={650}
          textAnchor="end"
          fill={dark ? '#fff' : valueFill}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </text>
      )}
    </motion.g>
  );
}

/** A small tick on a ring marking where one dimension sits. */
export function AssessmentMarker({
  cx,
  cy,
  r,
  deg,
  tone = 'ink',
  on,
  delay = 0,
}: {
  cx: number;
  cy: number;
  r: number;
  deg: number;
  tone?: Tone;
  on: boolean;
  delay?: number;
}) {
  const t = useTiming();
  const a = polar(cx, cy, r - 6, deg);
  const b = polar(cx, cy, r + 6, deg);
  return (
    <motion.line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={STROKE[tone]}
      strokeWidth={2}
      strokeLinecap="round"
      initial={{ opacity: 0 }}
      animate={{ opacity: on ? 1 : 0 }}
      transition={t(delay, 0.4)}
    />
  );
}

/**
 * The technical backdrop: faint concentric guides and a few radial ticks. Used in place
 * of a grid, which this page deliberately does without.
 */
export function GuideRings({
  cx,
  cy,
  radii,
  ticks = 0,
  dark = false,
  on,
}: {
  cx: number;
  cy: number;
  radii: number[];
  ticks?: number;
  dark?: boolean;
  on: boolean;
}) {
  const t = useTiming();
  const outer = radii[radii.length - 1];
  const color = dark ? 'rgba(255,255,255,0.08)' : 'rgba(11,23,48,0.07)';
  return (
    <motion.g aria-hidden initial={{ opacity: 0 }} animate={{ opacity: on ? 1 : 0 }} transition={t(0, 0.8)}>
      {radii.map((r, i) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeDasharray={i % 2 ? '2 6' : undefined} />
      ))}
      {Array.from({ length: ticks }, (_, i) => {
        const deg = (360 / ticks) * i;
        const a = polar(cx, cy, outer - 8, deg);
        const b = polar(cx, cy, outer + 8, deg);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} />;
      })}
    </motion.g>
  );
}

/* ── Interface pieces (HTML) ──────────────────────────────────────────── */

/** A labelled bar that fills to `value` (0–100). */
export function ProgressIndicator({
  label,
  value,
  tone = 'mint',
  highlight = false,
  compact = false,
  on,
  delay = 0,
  dark = false,
}: {
  label: string;
  value: number;
  tone?: 'mint' | 'amber' | 'funder';
  highlight?: boolean;
  /** One line per row: name, bar and value side by side. */
  compact?: boolean;
  on: boolean;
  delay?: number;
  dark?: boolean;
}) {
  const t = useTiming();
  const fill = tone === 'mint' ? 'bg-mint' : tone === 'amber' ? 'bg-amber' : 'bg-funder';
  return (
    <div
      className={cn(
        '-mx-2 rounded-lg px-2 transition-colors duration-300',
        compact ? 'grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 py-1.5' : 'py-1.5',
        highlight && (dark ? 'bg-white/[0.06]' : 'bg-mist'),
      )}
    >
      <div className={cn('bi-data flex items-baseline justify-between gap-3', compact && 'contents')}>
        <span className={cn(dark ? 'text-on-dark-muted' : 'text-mut', compact && 'truncate')}>{label}</span>
        <span className={cn('font-semibold', dark ? 'text-on-dark' : 'text-ink', compact && 'order-last text-right')}>{value}%</span>
      </div>
      <div className={cn('h-1.5 overflow-hidden rounded-full', !compact && 'mt-1.5', dark ? 'bg-white/10' : 'bg-mist')}>
        <motion.div
          className={cn('h-full origin-left rounded-full', fill)}
          style={{ width: `${value}%` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: on ? 1 : 0 }}
          transition={t(delay, 0.8)}
        />
      </div>
    </div>
  );
}

/** The recommendation surface: an area to improve, why, and the suggested next step. */
export function InsightCard({
  area,
  title,
  why,
  action,
  points,
  priority,
  on,
  delay = 0,
  compact = false,
  className,
}: {
  area: string;
  title: string;
  why: string;
  action: string;
  points?: number;
  priority?: string;
  on: boolean;
  delay?: number;
  /** Narrow columns: tighter padding and type. */
  compact?: boolean;
  className?: string;
}) {
  const t = useTiming();
  const item = (d: number) => ({
    initial: { opacity: 0, y: 8 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
    transition: t(delay + d, 0.45),
  });
  return (
    <motion.article
      className={cn('bi-glass rounded-card', compact ? 'p-4' : 'p-5 sm:p-6', className)}
      initial={{ opacity: 0, y: 16 }}
      animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={t(delay, 0.6)}
    >
      {/* The accent line: draws down the edge once the card has settled. */}
      <motion.span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] origin-top bg-(image:--gradient-score)"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: on ? 1 : 0 }}
        transition={t(delay + 0.45, 0.7)}
      />
      <motion.div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5" {...item(0.1)}>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-soft px-2.5 py-1 text-[12px] font-semibold text-amber-ink">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber" />
          Improve · {area}
        </span>
        {priority && <span className="bi-data text-mut">{priority}</span>}
      </motion.div>
      <motion.h3 className={cn('mt-4 text-ink', compact ? 'text-[15px] leading-[1.3] font-semibold tracking-[-0.015em]' : 'bi-h3')} {...item(0.18)}>
        {title}
      </motion.h3>
      <motion.div className="mt-2" {...item(0.26)}>
        <p className="bi-data font-semibold text-funder">Why it matters</p>
        <p className={cn('mt-1 leading-relaxed text-mut', compact ? 'text-[13px]' : 'text-[14px]')}>{why}</p>
      </motion.div>
      <motion.div className={cn('rounded-tile bg-mint-soft/70', compact ? 'mt-3 p-3' : 'mt-4 p-3.5')} {...item(0.36)}>
        <p className="bi-data font-semibold text-mint-ink">Suggested next step</p>
        <p className={cn('mt-1 leading-relaxed text-ink', compact ? 'text-[13px]' : 'text-[14px]')}>{action}</p>
      </motion.div>
      {points !== undefined && (
        <motion.p className="bi-data mt-3 text-mut" {...item(0.44)}>
          Score impact: up to +{points} of {MAX_SCORE}
        </motion.p>
      )}
    </motion.article>
  );
}

/** The small "this is an example" tag every sample visual carries. */
export function IllustrativeTag({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'bi-data inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        dark ? 'bg-white/[0.06] text-on-dark-muted' : 'bg-mist text-mut',
        className,
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', dark ? 'bg-mint' : 'bg-funder')} />
      {ILLUSTRATIVE}
    </span>
  );
}
