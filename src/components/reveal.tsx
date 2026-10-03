"use client";

import { motion } from "framer-motion";

/** The ease-out used for every UI reveal. Physical objects use springs instead. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Stagger offset in ms, for revealing siblings in sequence. */
  delay?: number;
  /** Rise distance in px. */
  y?: number;
  /** Play on mount instead of on first scroll into view (used above the fold). */
  immediate?: boolean;
  as?: "div" | "li";
};

/**
 * Reveal: opacity 0→1 and translateY → 0, once, when 30% of the element is in view.
 *
 * Under `prefers-reduced-motion` the landing page's `MotionConfig reducedMotion="user"`
 * drops the transform, so this degrades to a plain fade.
 */
export function Reveal({ children, className, delay = 0, y = 16, immediate = false, as = "div" }: RevealProps) {
  const Comp = as === "li" ? motion.li : motion.div;
  const shown = { opacity: 1, y: 0 };

  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      {...(immediate ? { animate: shown } : { whileInView: shown, viewport: { once: true, amount: 0.3 } })}
      transition={{ duration: 0.7, ease: EASE_OUT, delay: delay / 1000 }}
    >
      {children}
    </Comp>
  );
}
