'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

/**
 * The editorial landing page's shared vocabulary.
 *
 * One recurring idea: POSITION. The mint point is "you" — it sits at the end of the
 * headline, travels along every line on the page and marks what's working. Amber marks a
 * gap, blue marks a next step. Everything else is ink, paper and hairlines.
 */

export const EASE = [0.22, 1, 0.36, 1] as const;

export const wrap = 'mx-auto w-full max-w-[1280px] ed-x';

export const ASSESSMENT_HREF = '/interview';

/** The point. `tone` carries meaning, so it is never decorative. */
export function Point({
  tone = 'mint',
  size = 12,
  ring = 'paper',
  className,
}: {
  tone?: 'mint' | 'amber' | 'signal' | 'ink' | 'hollow';
  size?: number;
  ring?: 'paper' | 'ink' | 'none';
  className?: string;
}) {
  const fill = {
    mint: 'bg-mint',
    amber: 'bg-amber',
    signal: 'bg-signal',
    ink: 'bg-ink',
    hollow: 'bg-paper border border-hair-strong',
  }[tone];
  const ringColor = ring === 'paper' ? 'var(--paper)' : ring === 'ink' ? 'var(--ink)' : 'transparent';
  return (
    <span
      aria-hidden
      className={cn('block shrink-0 rounded-full', fill, className)}
      style={{ width: size, height: size, boxShadow: ring === 'none' ? undefined : `0 0 0 4px ${ringColor}` }}
    />
  );
}

/** The wordmark: the dot of the "i" is the point. */
export function Mark({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span
      className={cn(
        'font-headline inline-flex items-baseline text-[19px] font-semibold tracking-[-0.03em]',
        inverse ? 'text-paper' : 'text-ink',
        className,
      )}
    >
      <span className="relative inline-block">
        {/* Dotless i (U+0131) — the dot is drawn as the mint point. */}
        ı
        <span
          aria-hidden
          className="absolute left-1/2 top-[0.06em] block h-[0.2em] w-[0.2em] -translate-x-1/2 rounded-full bg-mint"
        />
      </span>
      STARTUP
      <span className="sr-only"> — home</span>
    </span>
  );
}

/** Section opener: index and journey stage, with a hairline running to the edge. */
export function SectionIndex({
  index,
  stage,
  inverse = false,
  className,
}: {
  index: string;
  stage: string;
  inverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <span className={cn('ed-label tabular-nums', inverse ? 'text-paper' : 'text-ink')}>{index}</span>
      <span className={cn('ed-label', inverse ? 'text-white/55' : 'text-mut')}>{stage}</span>
      <motion.span
        aria-hidden
        className={cn('h-px flex-1 origin-left', inverse ? 'bg-white/15' : 'bg-hair-strong')}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 1.2, ease: EASE }}
      />
    </div>
  );
}

/** Fade-and-rise on first view. Used sparingly, for content arriving in order. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'li' | 'p';
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </Comp>
  );
}

/** Primary action. Solid, product-like; the arrow moves forward on hover. */
export function PrimaryCta({
  children = 'Get your iSTARTUP Score',
  inverse = false,
  className,
  id,
}: {
  children?: ReactNode;
  inverse?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <Link
      id={id}
      href={ASSESSMENT_HREF}
      className={cn(
        'group inline-flex h-14 items-center gap-3 rounded-[6px] pl-6 pr-5 text-[15px] font-medium tracking-[-0.01em] transition-colors duration-300',
        inverse ? 'bg-mint text-ink hover:bg-white' : 'bg-ink text-paper hover:bg-[#1a2a4d]',
        className,
      )}
    >
      {children}
      <span aria-hidden className="transition-transform duration-300 ease-out group-hover:translate-x-1">
        →
      </span>
    </Link>
  );
}

/** Quiet secondary: a text link whose underline draws in. */
export function TextLink({
  href,
  children,
  className,
  id,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <a
      id={id}
      href={href}
      className={cn('group relative inline-flex h-14 items-center text-[15px] font-medium text-ink', className)}
    >
      <span className="relative">
        {children}
        <span
          aria-hidden
          className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-[0.35] bg-ink transition-transform duration-500 ease-out group-hover:scale-x-100"
        />
      </span>
    </a>
  );
}

/**
 * A line icon in the page's meaning colours: mint is working, amber is a gap, signal is
 * a next step, ink is explanation. Bare — no tile — so it reads as part of the type.
 * Decorative: the text beside it carries the meaning, so it is hidden from assistive tech.
 * `size` is the icon's size in px.
 */
export function IconTile({
  icon: Icon,
  tone = 'ink',
  size = 28,
  className,
}: {
  icon: LucideIcon;
  tone?: 'mint' | 'amber' | 'signal' | 'ink';
  size?: number;
  className?: string;
}) {
  const tones = {
    mint: 'text-mint-ink',
    amber: 'text-amber-ink',
    signal: 'text-signal',
    ink: 'text-ink',
  }[tone];
  return <Icon aria-hidden className={cn('shrink-0', tones, className)} style={{ width: size, height: size }} strokeWidth={1.5} />;
}
