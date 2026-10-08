import { cn } from '@/lib/utils';

/**
 * Shared class recipes for the landing page. Focus rings come from the global
 * `:focus-visible`; colours and radii are tokens in globals.css. Everything is flat:
 * no shadows, no gradients.
 */

const button =
  'group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn font-medium transition-colors duration-200';

const sizes = {
  sm: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

/** Filled black: the one primary action in a view. */
export const btnPrimary = (size: keyof typeof sizes = 'lg') =>
  cn(button, sizes[size], 'bg-accent text-accent-ink hover:bg-accent-hover');

/** Ghost with a 1.5px border: the secondary action beside a primary. */
export const btnSecondary = (size: keyof typeof sizes = 'lg') =>
  cn(button, sizes[size], 'rounded-[4px] border-[1.5px] border-fg-muted text-fg-muted hover:border-fg hover:text-fg');

/** On navy blocks: funding-green fill, navy text. */
export const btnOnDark = (size: keyof typeof sizes = 'lg') =>
  cn(button, sizes[size], 'bg-fund text-ink hover:bg-surface');

/** Arrow inside a button: nudges right on hover. */
export const btnArrow = 'h-4 w-4 transition-transform duration-200 group-hover:translate-x-1';

export const container = 'mx-auto w-full max-w-[1200px] gutter-x';

/** Flat white card on the canvas: separated by colour, not borders or shadow. */
export const card = 'rounded-panel bg-surface';
