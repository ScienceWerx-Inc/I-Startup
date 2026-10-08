'use client';

import { motion } from 'framer-motion';

import { EASE_OUT } from '@/components/reveal';
import { cn } from '@/lib/utils';

type ProgressBarProps = {
  percent: number;
  /** Fill colour; defaults to ink. */
  color?: string;
  delay?: number;
  className?: string;
};

/**
 * A bar that fills 0 → percent the first time it scrolls into view. The track observes
 * the viewport, because the fill starts at scaleX 0 — a zero-area box that never
 * intersects.
 */
export function ProgressBar({ percent, color, delay = 0, className }: ProgressBarProps) {
  return (
    <motion.div
      aria-hidden
      className={cn('overflow-hidden rounded-full bg-surface-2', className)}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true }}
    >
      <motion.div
        className={cn('h-full origin-left rounded-full', !color && 'bg-fg')}
        style={{ width: `${percent}%`, background: color }}
        variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }}
        transition={{ duration: 0.9, ease: EASE_OUT, delay }}
      />
    </motion.div>
  );
}
