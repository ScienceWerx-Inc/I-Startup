'use client';

import { MotionConfig } from 'framer-motion';

/**
 * Honour prefers-reduced-motion across the landing page: Framer Motion skips transform
 * animations and keeps opacity, so scroll reveals become simple fades.
 */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
