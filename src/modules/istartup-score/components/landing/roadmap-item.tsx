'use client';

import { useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, ChevronDown } from 'lucide-react';

import { EASE_OUT } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { dimensionOf, type RoadmapStep } from './data';

type RoadmapItemProps = {
  step: RoadmapStep;
  index: number;
  open: boolean;
  last: boolean;
  onToggle: () => void;
};

/** One recommended step: a node on the progress path, a clickable row, and an expandable explanation. */
export function RoadmapItem({ step, index, open, last, onToggle }: RoadmapItemProps) {
  const panelId = useId();
  const dim = dimensionOf(step.dimension);
  const first = index === 0;

  return (
    <motion.li className="relative grid grid-cols-[32px_1fr] gap-x-4" initial="hidden" whileInView="shown" viewport={{ once: true }}>
      {/* Progress path: node plus the connector down to the next step. */}
      <div className="relative flex justify-center" aria-hidden>
        <span
          className={cn(
            'relative z-10 mt-3 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold tabular',
            first ? 'bg-blue-gradient text-accent-ink shadow-glow' : 'border border-edge-strong bg-surface text-fg-muted',
          )}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        {!last && (
          <motion.span
            className={cn('absolute -bottom-3 top-11 w-0.5 origin-top rounded-full', first ? 'bg-blue-gradient' : 'bg-edge')}
            variants={{ hidden: { scaleY: 0 }, shown: { scaleY: 1 } }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.2 + index * 0.15 }}
          />
        )}
      </div>

      <div className={cn('pb-3', last && 'pb-0')}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            'flex w-full items-center gap-3 rounded-tile border px-4 py-3.5 text-left transition-[background-color,border-color,box-shadow] duration-200',
            open ? 'border-edge-strong bg-surface shadow-card' : 'border-transparent hover:border-edge hover:bg-surface/70',
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold leading-snug text-fg">{step.title}</span>
            <span className="mt-1 flex items-center gap-1.5 text-xs text-fg-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: dim.color }} />
              {dim.title}
            </span>
          </span>
          <span className="shrink-0 rounded-md bg-blue-soft px-2 py-1 text-xs font-semibold text-blue tabular">+{step.impact} pts</span>
          <ChevronDown
            aria-hidden
            className={cn('h-4 w-4 shrink-0 text-fg-muted transition-transform duration-200', open && 'rotate-180')}
            strokeWidth={1.75}
          />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-2 pt-3">
                <p className="text-sm leading-relaxed text-fg-muted">{step.detail}</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-fg">
                  <ArrowUpRight className="h-3.5 w-3.5 text-blue" strokeWidth={2} aria-hidden />
                  Could recover about {step.impact} points in {dim.title}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}
