'use client';

import { cn } from '@/lib/utils';

import type { Dimension } from './data';
import { ProgressBar } from './progress-bar';
import { card } from './ui';

type DimensionCardProps = {
  dimension: Dimension;
  index: number;
  highestWeight: boolean;
  active: boolean;
  onActive: (active: boolean) => void;
};

/** One scored dimension: icon, name, description, percentage and a bar that fills on view. */
export function DimensionCard({ dimension: d, index, highestWeight, active, onActive }: DimensionCardProps) {
  const Icon = d.icon;
  const weight = Math.round(d.weight * 100);

  return (
    <div
      tabIndex={0}
      aria-label={`${d.title}: ${d.percent}%, ${weight}% of the score. ${d.description}`}
      onMouseEnter={() => onActive(true)}
      onMouseLeave={() => onActive(false)}
      onFocus={() => onActive(true)}
      onBlur={() => onActive(false)}
      className={cn(
        card,
        'cursor-default p-4 transition-[transform,box-shadow,border-color] duration-200 sm:p-5',
        active && '-translate-y-1 shadow-raised',
      )}
      style={active ? { borderColor: `color-mix(in oklab, ${d.color} 55%, transparent)` } : undefined}
    >
      <div aria-hidden className="flex items-start gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-fg"
          style={{ background: `color-mix(in oklab, ${d.color} 14%, transparent)` }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-bold tracking-[-0.01em] text-fg">{d.title}</h3>
            <span className="text-xl font-extrabold tracking-[-0.015em] text-fg tabular">{d.percent}%</span>
          </div>
          <p className="mt-0.5 text-sm leading-relaxed text-fg-muted">{d.description}</p>
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar percent={d.percent} color={d.color} delay={0.1 + index * 0.08} className="h-1.5 flex-1" />
            <span className={cn('shrink-0 text-xs tabular', highestWeight ? 'font-semibold text-fg' : 'text-fg-muted')}>
              {weight}% weight
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
