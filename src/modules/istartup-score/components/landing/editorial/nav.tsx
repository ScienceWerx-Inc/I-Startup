'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

import { cn } from '@/lib/utils';
import { ASSESSMENT_HREF, EASE, Mark, wrap } from './shared';

/**
 * The navigation *is* the journey. Its four stages map onto the page's sections, the
 * current one is marked with the point, and the hairline underneath fills as you read —
 * the page behaves like an assessment you are moving through.
 */
export const JOURNEY = [
  { key: 'assess', label: 'Assess', href: '#assess', sections: ['assess'] },
  { key: 'understand', label: 'Understand', href: '#understand', sections: ['understand', 'working'] },
  { key: 'improve', label: 'Improve', href: '#improve', sections: ['improve'] },
  { key: 'prepare', label: 'Prepare', href: '#prepare', sections: ['prepare', 'start'] },
] as const;

const SECTION_IDS = JOURNEY.flatMap((j) => j.sections);

/**
 * `landing` floats over the hero and tracks the page's sections. `page` is the same bar for
 * the other screens (the assessment): it sits in the flow, links back into the landing,
 * and swaps the CTA for whatever the page puts in `right`.
 */
export function Nav({ variant = 'landing', right }: { variant?: 'landing' | 'page'; right?: ReactNode }) {
  const onLanding = variant === 'landing';
  const [scrolledY, setScrolled] = useState(false);
  const scrolled = scrolledY || !onLanding;
  const [active, setActive] = useState<string>('assess');

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const tip = useTransform(progress, (v) => `${v * 100}%`);

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 8);
      const probe = window.innerHeight * 0.42;
      let current: string = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= probe) current = id;
      }
      const stage = JOURNEY.find((j) => (j.sections as readonly string[]).includes(current));
      if (stage) setActive(stage.key);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <header
      className={cn(
        'theme-ed inset-x-0 top-0 z-50 transition-colors duration-500',
        onLanding ? 'fixed' : 'no-print sticky',
        scrolled ? 'bg-paper' : 'bg-transparent',
      )}
    >
      <div className={cn(wrap, 'flex h-[68px] items-center justify-between gap-6')}>
        <Link href="/" aria-label="iSTARTUP home" className="rounded-sm">
          <Mark />
        </Link>

        <nav aria-label="Journey" className="hidden md:block">
          <ol className="flex items-center gap-1">
            {JOURNEY.map((j, i) => {
              const isActive = active === j.key;
              return (
                <li key={j.key} className="flex items-center">
                  <a
                    href={onLanding ? j.href : `/${j.href}`}
                    aria-current={isActive ? 'step' : undefined}
                    className={cn(
                      'relative flex items-center gap-2 rounded-sm px-3 py-2 text-[14px] font-medium tracking-[-0.01em] transition-colors duration-300',
                      isActive ? 'text-ink' : 'text-faint hover:text-ink',
                    )}
                  >
                    <span className="relative flex h-2 w-2 items-center justify-center">
                      {isActive ? (
                        <motion.span
                          layoutId="journey-point"
                          className="absolute h-2 w-2 rounded-full bg-mint"
                          transition={{ duration: 0.5, ease: EASE }}
                        />
                      ) : (
                        <span className="h-[3px] w-[3px] rounded-full bg-current opacity-60" />
                      )}
                    </span>
                    {j.label}
                  </a>
                  {i < JOURNEY.length - 1 && (
                    <span aria-hidden className="text-[13px] text-faint/70">
                      →
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex items-center gap-5">
          {right}
          <Link
            href="/login"
            className="hidden text-[14px] font-medium text-mut transition-colors hover:text-ink sm:block"
          >
            Log in
          </Link>
          {onLanding && (
            <Link
              id="nav-cta"
              href={ASSESSMENT_HREF}
              className="group inline-flex h-10 items-center gap-2 rounded-[5px] bg-ink px-4 text-[14px] font-medium text-paper transition-colors hover:bg-[#1a2a4d]"
            >
              Get your score
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* The living line: reading progress, with the point at its tip. */}
      <div aria-hidden className="relative h-px w-full">
        <div
          className={cn(
            'absolute inset-0 transition-colors duration-500',
            scrolled ? 'bg-hair' : 'bg-transparent',
          )}
        />
        {/* Reading progress only means something on the landing; other pages keep the hairline. */}
        {onLanding && (
          <>
            <motion.div className="absolute inset-y-0 left-0 origin-left bg-ink" style={{ scaleX: progress, width: '100%' }} />
            <motion.span
              className="absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mint"
              style={{ left: tip, opacity: scrolled ? 1 : 0 }}
            />
          </>
        )}
      </div>
    </header>
  );
}
