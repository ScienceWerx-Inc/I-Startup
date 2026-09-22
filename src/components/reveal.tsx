"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Stagger offset in ms, for revealing siblings in sequence. */
  delay?: number;
};

/**
 * Scroll reveal: opacity 0→1 and translateY 16px→0 over 700ms, fired once on
 * first intersection and then unobserved.
 *
 * The hidden state is a real `opacity: 0`, so the reveal must be fail-safe —
 * anything that stops the observer from firing has to leave content visible,
 * never blank. Hence the early reveal when IntersectionObserver is missing or
 * reduced motion is requested, plus the matching CSS escape hatch.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRevealed(true);
        observer.disconnect();
      },
      // Pulled up slightly from the bottom edge so the move completes while the
      // element is still travelling into view rather than after it has landed.
      { threshold: 0.15, rootMargin: "0px 0px -64px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", revealed && "is-revealed", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Reveals each child in sequence. Children are spaced by `step` ms, capped so a
 * long list never leaves the last item waiting on a visibly stale delay.
 */
export function RevealGroup({
  children,
  className,
  step = 90,
  maxDelay = 450,
}: {
  children: React.ReactNode;
  className?: string;
  step?: number;
  maxDelay?: number;
}) {
  return (
    <>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <Reveal key={i} className={className} delay={Math.min(i * step, maxDelay)}>
              {child}
            </Reveal>
          ))
        : <Reveal className={className}>{children}</Reveal>}
    </>
  );
}
