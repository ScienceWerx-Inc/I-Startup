import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, type FormatDistanceToNowOptions } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Safely converts a Firestore Timestamp, Date, or null/undefined to a JS Date. */
export function tsToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') return new Date(value);
  return null;
}

/**
 * `formatDistanceToNow` that never throws. `tsToDate` happily returns an
 * Invalid Date for an unparseable value (see src/lib/calendar/normalize.ts) —
 * date-fns throws a RangeError on that rather than returning a fallback
 * string, which has repeatedly crashed whole pages (notification bell,
 * activity feeds) fed a Firestore Timestamp or a missing field where a date
 * string was assumed. Returns '' for anything that doesn't resolve to a real date.
 */
export function safeFormatDistanceToNow(value: unknown, options?: FormatDistanceToNowOptions): string {
  const date = tsToDate(value);
  if (!date || !Number.isFinite(date.getTime())) return '';
  return formatDistanceToNow(date, options);
}
