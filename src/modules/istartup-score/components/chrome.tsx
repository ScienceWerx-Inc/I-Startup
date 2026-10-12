import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The shared surfaces every iSTARTUP screen is built from — the equivalent of
 * FounderFit's `paper.tsx`: a paper page, white panels on it, small mono eyebrows, and
 * pill chips for unscored choices.
 */

/**
 * The iStartup Score® gradient wordmark. `inverse` swaps in the version with white
 * lettering for dark surfaces; the gradient "Score" is the same in both. Headers load it
 * eagerly (it is above the fold); pass `eager={false}` lower down the page.
 */
export function Wordmark({
  className,
  inverse = false,
  eager = true,
}: {
  className?: string;
  inverse?: boolean;
  eager?: boolean;
}) {
  return (
    <Image
      src={inverse ? '/brand/istartup-score-wordmark-light.png' : '/brand/istartup-score-wordmark.png'}
      alt="iStartup Score"
      width={1151}
      height={160}
      loading={eager ? 'eager' : 'lazy'}
      className={cn('h-[22px] w-auto shrink-0 sm:h-[26px]', className)}
    />
  );
}

export function SiteHeader({ right, wide = true }: { right?: ReactNode; wide?: boolean }) {
  return (
    // A div rather than <header> so it never inherits page-level header styling.
    <div className="no-print sticky top-0 z-30 bg-paper/90 px-4 pb-3 pt-3 backdrop-blur sm:px-6">
      <div className={cn('mx-auto flex h-14 items-center justify-between gap-4 rounded-full bg-surface px-5', wide ? 'max-w-6xl' : 'max-w-3xl')}>
        <Link href="/" aria-label="iStartup Score home" className="rounded-md text-ink">
          <Wordmark />
        </Link>
        {right ? <div className="flex items-center gap-3 text-sm text-mut">{right}</div> : null}
      </div>
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-card bg-surface p-6 sm:p-8', className)}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('eyebrow', className)}>{children}</p>;
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-2 text-sm transition-colors',
        selected ? 'bg-fund-soft font-medium text-ink' : 'bg-mist text-mut hover:bg-line hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
