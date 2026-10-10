import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The shared surfaces every iSTARTUP screen is built from — the equivalent of
 * FounderFit's `paper.tsx`: a paper page, white panels on it, small mono eyebrows, and
 * pill chips for unscored choices.
 */

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {/* A flat rendering of the app icon (app/icon.svg): the score gauge. */}
      <svg viewBox="32 32 448 448" className="h-7 w-7 shrink-0" aria-hidden>
        <rect x="32" y="32" width="448" height="448" rx="104" fill="var(--ink)" />
        <path d="M121 312A135 135 0 0 1 391 312" fill="none" stroke="#22364b" strokeWidth="38" strokeLinecap="round" />
        <path d="M121 312A135 135 0 0 1 378.4 254.9" fill="none" stroke="var(--brand-bright)" strokeWidth="38" strokeLinecap="round" />
        <line x1="256" y1="312" x2="311" y2="216.7" stroke="#fff" strokeWidth="15" strokeLinecap="round" />
        <circle cx="256" cy="312" r="24" fill="#fff" />
        <circle cx="256" cy="312" r="10" fill="var(--ink)" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-current">
        iSTARTUP<span className="ml-1 font-normal opacity-70">Score</span>
      </span>
    </span>
  );
}

export function SiteHeader({ right, wide = true }: { right?: ReactNode; wide?: boolean }) {
  return (
    // A div rather than <header> so it never inherits page-level header styling.
    <div className="no-print sticky top-0 z-30 bg-paper/90 px-4 pb-3 pt-3 backdrop-blur sm:px-6">
      <div className={cn('mx-auto flex h-14 items-center justify-between gap-4 rounded-full bg-surface px-5', wide ? 'max-w-6xl' : 'max-w-3xl')}>
        <Link href="/" aria-label="iSTARTUP Score home" className="rounded-md text-ink">
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
