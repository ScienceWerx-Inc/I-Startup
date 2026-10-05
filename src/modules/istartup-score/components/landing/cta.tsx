'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { Reveal } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { MAX_SCORE, SAMPLE_SCORE } from './data';
import { btnArrow, btnPrimary, container } from './ui';

/** Bottom to top. Each layer floats at its own pace. */
const LAYERS = [
  { label: 'Readiness', size: 'text-sm font-semibold uppercase tracking-[0.16em]' },
  { label: 'Score', size: 'text-sm font-semibold uppercase tracking-[0.16em]' },
  { label: `/ ${MAX_SCORE}`, size: 'text-3xl font-bold tracking-[-0.015em]' },
  { label: String(SAMPLE_SCORE), size: 'text-6xl font-extrabold tracking-[-0.02em]' },
];
const SPACING = 44; // px between layers along Z

const mix = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, transparent)`;

export function CTA() {
  return (
    <section className="relative isolate overflow-hidden bg-navy">
      {/* CSS-only backdrop: two soft glows. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-[10%] -top-[30%] h-[40rem] w-[40rem] rounded-full" style={{ background: `radial-gradient(closest-side, ${mix('var(--blue-electric)', 30)}, transparent)` }} />
        <div className="absolute -bottom-[40%] -left-[10%] h-[36rem] w-[36rem] rounded-full" style={{ background: `radial-gradient(closest-side, ${mix('var(--purple)', 28)}, transparent)` }} />
      </div>

      <div className={cn(container, 'section-y grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]')}>
        <Reveal>
          <h2 className="display-lg text-on-dark">
            Ready to see where <br className="hidden sm:block" />
            you stand?
          </h2>
          <p className="mt-6 max-w-[32rem] text-[var(--fs-lead)] leading-[var(--leading-body)] text-on-dark-muted">
            Your iSTARTUP Score is a key part of the PNPL application. It takes about ten minutes, and your progress is
            saved as you go.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/interview" className={btnPrimary()}>
              Calculate your score <ArrowRight className={btnArrow} />
            </Link>
            <a
              href="#how-it-works"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-tile border border-on-dark/20 px-6 text-[15px] font-semibold text-on-dark transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-on-dark/40 hover:bg-on-dark/5"
            >
              See how it works
            </a>
          </div>
        </Reveal>

        <GlassStack />
      </div>
    </section>
  );
}

/** Translucent layers stacked in 3D with CSS transforms, each drifting slowly. */
function GlassStack() {
  return (
    <div
      aria-hidden
      className="relative mx-auto h-[280px] w-full max-w-[420px] sm:h-[360px]"
      style={{ perspective: 1100 }}
    >
      <div
        className="absolute left-1/2 top-[58%] h-[170px] w-[170px] sm:h-[220px] sm:w-[220px]"
        style={{ transformStyle: 'preserve-3d', transform: 'translate(-50%, -50%) rotateX(58deg) rotateZ(-38deg)' }}
      >
        {LAYERS.map((layer, i) => (
          <motion.div
            key={layer.label}
            className="absolute inset-0 flex items-center justify-center rounded-panel border text-on-dark"
            style={{
              borderColor: mix('var(--on-dark)', 28),
              background: `linear-gradient(135deg, ${mix('var(--blue-electric)', 42 - i * 4)}, ${mix('var(--purple)', 30 + i * 4)})`,
              boxShadow: `0 0 48px -8px ${mix('var(--blue-electric)', 45)}, inset 0 1px 0 ${mix('var(--on-dark)', 25)}`,
            }}
            initial={{ z: i * SPACING, opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            animate={{ z: [i * SPACING, i * SPACING + 12, i * SPACING] }}
            transition={{
              z: { duration: 6 + i * 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 },
              opacity: { duration: 0.6, delay: 0.15 + i * 0.12 },
            }}
          >
            <span className={layer.size}>{layer.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
