'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { ArrowRight, Check, Gauge, TrendingUp } from 'lucide-react';

import { EASE_OUT, Reveal } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { AmbientBackground } from './ambient-background';
import { SAMPLE_BAND, SCORE_GROWTH } from './data';
import { ScoreDashboard } from './score-dashboard';
import { btnArrow, btnPrimary, btnSecondary, container } from './ui';
import { useRichPointer } from './use-media-query';

const TRUST = ['2K+ startups assessed', 'Backed by a proven framework', 'Get insights in minutes'];

/**
 * Hero: editorial headline on the left, a live score dashboard on the right. On desktop
 * with a fine pointer the dashboard sits in a slight 3D tilt and follows the cursor; the
 * floating cards and background orbs move at different rates for depth. Flat on touch,
 * small screens and under reduced motion.
 */
export function Hero() {
  const rich = useRichPointer();
  const sectionRef = useRef<HTMLElement>(null);
  const [hovering, setHovering] = useState(false);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 110, damping: 20, mass: 0.6 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);

  const rotateY = useTransform(sx, [-0.5, 0.5], [-12, 0]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [9, 3]);
  const dashX = useTransform(sx, (v) => v * 14);
  const dashY = useTransform(sy, (v) => v * 10);
  const cardAX = useTransform(sx, (v) => v * 34);
  const cardAY = useTransform(sy, (v) => v * 26);
  const cardBX = useTransform(sx, (v) => v * -26);
  const cardBY = useTransform(sy, (v) => v * -20);

  const onPointerMove = (e: React.PointerEvent) => {
    if (!rich || !sectionRef.current) return;
    const r = sectionRef.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <section
      ref={sectionRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative isolate overflow-hidden pb-[var(--space-section)] pt-28 sm:pt-32 lg:pt-32"
    >
      <AmbientBackground dots lines shapes pointerX={rich ? sx : undefined} pointerY={rich ? sy : undefined} />

      <div className={cn(container, 'grid items-center gap-14 lg:grid-cols-[1.02fr_1fr] lg:gap-12 xl:gap-20')}>
        <div>
          <Reveal immediate y={10}>
            <h1 className="display-xl text-fg">
              <span className="block">Know how</span>
              <span className="block">fundable your</span>
              <span className="block">startup is —</span>
              <span className="block text-blue">before investors</span>
              <span className="block">decide.</span>
            </h1>
          </Reveal>
          <Reveal immediate y={10} delay={120}>
            <p className="lead mt-6 max-w-[34rem]">
              The iSTARTUP Score benchmarks your startup across management, momentum, business model, market and
              motivation — so you can see exactly what investors see and where to improve your funding readiness.
            </p>
          </Reveal>
          <Reveal immediate y={10} delay={180}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/interview" className={btnPrimary()}>
                Get your score <ArrowRight className={btnArrow} />
              </Link>
              <a href="#how-it-works" className={btnSecondary()}>
                See how it works
              </a>
            </div>
          </Reveal>
          <Reveal immediate y={10} delay={240}>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
              {TRUST.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-fg-muted">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-soft text-blue">
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <motion.div
          className="relative mx-auto w-full max-w-[520px] lg:max-w-none"
          style={{ perspective: 1400 }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.15 }}
        >
          <motion.div
            style={rich ? { rotateX, rotateY, x: dashX, y: dashY, transformStyle: 'preserve-3d' } : undefined}
            onPointerEnter={() => setHovering(true)}
            onPointerLeave={() => setHovering(false)}
          >
            <ScoreDashboard active={hovering} />
          </motion.div>

          <FloatingCard className="-left-6 top-[46%] xl:-left-16" x={rich ? cardAX : undefined} y={rich ? cardAY : undefined} delay={0.9} drift={7}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-soft text-blue">
              <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-lg font-bold leading-none text-fg tabular">+{SCORE_GROWTH}%</p>
              <p className="mt-1 text-xs text-fg-muted">Score growth</p>
            </div>
          </FloatingCard>

          <FloatingCard className="-bottom-6 -right-3 xl:-right-8" x={rich ? cardBX : undefined} y={rich ? cardBY : undefined} delay={1.1} drift={9}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lavender text-purple">
              <Gauge className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-xs text-fg-muted">Investor readiness</p>
              <p className="mt-0.5 text-sm font-semibold text-fg">{SAMPLE_BAND}</p>
              <span className="mt-2 flex gap-1" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cn('h-1 w-6 rounded-full', i < 3 ? 'bg-purple' : 'bg-edge')} />
                ))}
              </span>
            </div>
          </FloatingCard>
        </motion.div>
      </div>
    </section>
  );
}

type FloatingCardProps = {
  children: React.ReactNode;
  className?: string;
  x?: MotionValue<number>;
  y?: MotionValue<number>;
  delay: number;
  /** Idle float distance in px. */
  drift: number;
};

/** A small card that pops in, idles with a slow float, and parallaxes with the pointer. */
function FloatingCard({ children, className, x, y, delay, drift }: FloatingCardProps) {
  return (
    <motion.div className={cn('absolute z-10 hidden sm:block', className)} style={{ x, y }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay }}
      >
        <motion.div
          className="flex items-center gap-3 rounded-card border border-edge bg-surface/90 p-3.5 pr-5 shadow-float backdrop-blur"
          animate={{ y: [0, -drift, 0] }}
          transition={{ duration: 6 + drift / 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
