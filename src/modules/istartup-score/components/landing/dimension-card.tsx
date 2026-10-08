'use client';

import { cn } from '@/lib/utils';

import type { Dimension } from './data';
import { ProgressBar } from './progress-bar';

type DimensionCardProps = {
  dimension: Dimension;
  index: number;
  highestWeight: boolean;
  active: boolean;
  onActive: (active: boolean) => void;
};

/**
 * One scored dimension: colour swatch, name, description, percentage and a bar that fills
 * on view. Flat white; the active card inverts to black.
 */
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
        'cursor-default rounded-card p-4 transition-colors duration-200 sm:p-5',
        active ? 'bg-carbon text-on-dark' : 'bg-surface text-fg',
      )}
    >
      <div aria-hidden className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink" style={{ background: d.color }}>
          <Icon className={cn('h-[18px] w-[18px]', (d.key === 'management' || d.key === 'business_model') && 'text-on-dark')} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-medium tracking-[-0.02em]">{d.title}</h3>
            <span className="font-display text-2xl font-bold leading-none tracking-[-0.03em] tabular">{d.percent}%</span>
          </div>
          <p className={cn('mt-0.5 text-sm leading-relaxed', active ? 'text-on-dark-muted' : 'text-fg-muted')}>{d.description}</p>
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar percent={d.percent} color={d.color} delay={0.1 + index * 0.08} className={cn('h-1.5 flex-1', active && 'bg-graphite')} />
            <span
              className={cn(
                'shrink-0 font-mono text-xs tracking-[-0.03em] tabular',
                highestWeight ? 'rounded-full bg-fund-soft px-2 py-0.5 text-ink' : active ? 'text-on-dark-muted' : 'text-fg-muted',
              )}
            >
              {weight}% weight
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
