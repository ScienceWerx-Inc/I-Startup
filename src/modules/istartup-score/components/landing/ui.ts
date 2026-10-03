import { cn } from '@/lib/utils';

/**
 * Shared class recipes for the landing page. Focus rings come from
 * `.theme-landing :focus-visible`; colours, radii and shadows are tokens in globals.css.
 */

const button =
  'group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-tile font-semibold transition-[transform,box-shadow,background-color,border-color] duration-200 hover:-translate-y-0.5 active:translate-y-0';

const sizes = {
  sm: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

export const btnPrimary = (size: keyof typeof sizes = 'lg') =>
  cn(button, sizes[size], 'bg-blue-gradient text-accent-ink shadow-card hover:shadow-glow');

export const btnSecondary = (size: keyof typeof sizes = 'lg') =>
  cn(button, sizes[size], 'border border-edge-strong bg-surface text-fg shadow-hairline hover:border-fg-muted/40 hover:shadow-raised');

/** Arrow inside a button: nudges right on hover. */
export const btnArrow = 'h-4 w-4 transition-transform duration-200 group-hover:translate-x-1';

export const container = 'mx-auto w-full max-w-[1280px] gutter-x';

export const card = 'rounded-card border border-edge bg-surface shadow-card';

/** Lift on hover: up 4px, stronger border, a little more shadow. */
export const cardHover = 'transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-edge-strong hover:shadow-raised';
