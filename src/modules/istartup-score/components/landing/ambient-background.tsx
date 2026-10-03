'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';

import { cn } from '@/lib/utils';

type AmbientBackgroundProps = {
  orbs?: boolean;
  grid?: boolean;
  dots?: boolean;
  lines?: boolean;
  shapes?: boolean;
  /** Normalised pointer position (-0.5…0.5); the orbs drift gently against it. */
  pointerX?: MotionValue<number>;
  pointerY?: MotionValue<number>;
  className?: string;
};

const mix = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, transparent)`;

/**
 * Decorative, CSS/SVG-only backdrop: soft gradient orbs, a faint grid, dots, hairline
 * curves and a few floating geometric marks. Always behind content (place it inside a
 * `relative isolate` parent) and hidden from assistive tech. The heavier layers (lines,
 * shapes) only render from `md` up.
 */
export function AmbientBackground({
  orbs = true,
  grid = false,
  dots = false,
  lines = false,
  shapes = false,
  pointerX,
  pointerY,
  className,
}: AmbientBackgroundProps) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      {orbs && <Orbs pointerX={pointerX} pointerY={pointerY} />}

      {grid && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${mix('var(--navy)', 5)} 1px, transparent 1px), linear-gradient(90deg, ${mix('var(--navy)', 5)} 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000 20%, transparent 75%)',
          }}
        />
      )}

      {dots && (
        <div
          className="absolute right-0 top-0 h-80 w-80 sm:h-[28rem] sm:w-[28rem]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${mix('var(--navy)', 14)} 1px, transparent 0)`,
            backgroundSize: '18px 18px',
            maskImage: 'radial-gradient(circle at 70% 30%, #000 10%, transparent 65%)',
          }}
        />
      )}

      {lines && (
        <svg className="absolute inset-0 hidden h-full w-full md:block" preserveAspectRatio="none" viewBox="0 0 1440 900" fill="none">
          <path d="M-40 640 C 320 520, 560 760, 900 600 S 1360 420, 1500 500" stroke="var(--border-strong)" strokeOpacity="0.6" />
          <path d="M-40 700 C 360 600, 600 820, 940 660 S 1380 500, 1500 580" stroke="var(--blue)" strokeOpacity="0.08" />
        </svg>
      )}

      {shapes && <Shapes />}
    </div>
  );
}

function Orbs({ pointerX, pointerY }: { pointerX?: MotionValue<number>; pointerY?: MotionValue<number> }) {
  // Drift opposite the pointer, a few dozen px at most. Static when no pointer is given.
  const zero = useTransform(() => 0);
  const x = useTransform(pointerX ?? zero, (v) => v * -40);
  const y = useTransform(pointerY ?? zero, (v) => v * -30);

  return (
    <motion.div className="absolute inset-0" style={{ x, y }}>
      <div
        className="absolute -right-[10%] -top-[20%] h-[44rem] w-[44rem] rounded-full"
        style={{ background: `radial-gradient(closest-side, ${mix('var(--blue-electric)', 18)}, transparent)` }}
      />
      <div
        className="absolute -left-[15%] top-[25%] h-[36rem] w-[36rem] rounded-full"
        style={{ background: `radial-gradient(closest-side, ${mix('var(--purple)', 10)}, transparent)` }}
      />
      <div
        className="absolute bottom-[-30%] left-[35%] h-[30rem] w-[30rem] rounded-full"
        style={{ background: `radial-gradient(closest-side, ${mix('var(--blue)', 8)}, transparent)` }}
      />
    </motion.div>
  );
}

const SHAPES = [
  { className: 'left-[2.5%] top-[22%]', d: 'circle', duration: 9 },
  { className: 'right-[8%] top-[62%]', d: 'plus', duration: 11 },
  { className: 'left-[44%] top-[8%]', d: 'square', duration: 13 },
  { className: 'left-[3%] bottom-[8%]', d: 'triangle', duration: 10 },
] as const;

function Shapes() {
  return (
    // Only where the page margin is wide enough that the marks never sit behind text.
    <div className="absolute inset-0 hidden min-[1400px]:block">
      {SHAPES.map((s, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 24 24"
          className={cn('absolute h-5 w-5', s.className)}
          fill="none"
          stroke={i % 2 ? 'var(--purple)' : 'var(--blue)'}
          strokeOpacity="0.35"
          strokeWidth="1.5"
          animate={{ y: [0, -10, 0], rotate: [0, 8, 0] }}
          transition={{ duration: s.duration, repeat: Infinity, ease: 'easeInOut' }}
        >
          {s.d === 'circle' && <circle cx="12" cy="12" r="8" />}
          {s.d === 'plus' && <path d="M12 5v14M5 12h14" strokeLinecap="round" />}
          {s.d === 'square' && <rect x="5" y="5" width="14" height="14" rx="3" transform="rotate(15 12 12)" />}
          {s.d === 'triangle' && <path d="M12 4 20 19H4Z" strokeLinejoin="round" />}
        </motion.svg>
      ))}
    </div>
  );
}
