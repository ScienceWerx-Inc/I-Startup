'use client';

import { useSyncExternalStore } from 'react';

/**
 * Hydration-safe media query: false on the server and during hydration, then the live
 * value. Used to switch interaction modes (parallax, tilt) without hydration mismatches.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/** Desktop with a precise pointer and motion allowed: where parallax and tilt run. */
export const useRichPointer = () =>
  useMediaQuery('(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
