'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';

import { cn } from '@/lib/utils';
import { DIMENSION_COUNT, QUESTION_COUNT } from './example';
import { JOURNEY } from './nav';
import { EASE, Mark, PrimaryCta, SectionIndex, wrap } from './shared';

/**
 * The close. The only inverted block on the page: the journey line returns, and this
 * time the point makes it all the way to the end.
 */
export function Closing() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });

  return (
    <section id="start" aria-labelledby="closing-title" className="bg-ink text-paper">
      <div className={cn(wrap, 'pb-10 pt-[var(--ed-section)]')}>
        <SectionIndex index="06" stage="Start" inverse />

        <div ref={ref} className="mt-10 lg:mt-14">
          <h2 id="closing-title" className="ed-mega max-w-[11ch] text-paper">
            {['Know before', 'they decide'].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className="block"
                  initial={{ y: '105%' }}
                  animate={inView ? { y: 0 } : {}}
                  transition={{ duration: 1.1, ease: EASE, delay: i * 0.09 }}
                >
                  {line}
                  {i === 1 && (
                    <motion.span
                      aria-hidden
                      className="ml-[0.05em] inline-block h-[0.17em] w-[0.17em] rounded-full bg-mint align-baseline"
                      initial={{ scale: 0 }}
                      animate={inView ? { scale: 1 } : {}}
                      transition={{ duration: 0.6, ease: EASE, delay: 0.8 }}
                    />
                  )}
                </motion.span>
              </span>
            ))}
            <span className="sr-only">.</span>
          </h2>

          <div className="mt-14 grid grid-cols-12 gap-x-6 gap-y-10">
            <motion.div
              className="col-span-12 md:col-span-7 md:col-start-6 lg:col-span-5 lg:col-start-8"
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, ease: EASE, delay: 0.4 }}
            >
              <p className="max-w-[28rem] text-[clamp(1.0625rem,0.98rem+0.35vw,1.3125rem)] leading-[1.5] tracking-[-0.011em] text-white/70 text-pretty">
                {QUESTION_COUNT} questions across {DIMENSION_COUNT} dimensions. One clear picture of where you
                stand — before an investor draws their own.
              </p>
              <PrimaryCta id="closing-cta" inverse className="mt-8" />
            </motion.div>
          </div>
        </div>

        {/* The journey, complete */}
        <div className="mt-16 lg:mt-20">
          <div className="relative h-14">
            <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
            <motion.div
              aria-hidden
              className="absolute left-0 top-1/2 h-px bg-paper"
              initial={{ width: 0 }}
              animate={inView ? { width: '100%' } : {}}
              transition={{ duration: 2.4, ease: EASE, delay: 0.9 }}
            />
            {JOURNEY.map((j, i) => {
              const at = i / (JOURNEY.length - 1);
              const last = i === JOURNEY.length - 1;
              return (
                <div key={j.key} className="absolute top-0 h-full" style={last ? { right: 0 } : { left: `${at * 100}%` }}>
                  <span
                    aria-hidden
                    className={cn('absolute top-1/2 h-[9px] w-px -translate-y-1/2 bg-white/30', last ? 'right-0' : 'left-0')}
                  />
                  <a
                    href={j.href}
                    className={cn(
                      'absolute top-[calc(50%+14px)] whitespace-nowrap rounded-sm text-[13px] font-medium text-white/55 transition-colors hover:text-paper',
                      i === 0 ? 'left-0' : last ? 'right-0' : '-translate-x-1/2',
                    )}
                  >
                    {j.label}
                  </a>
                </div>
              );
            })}
            <motion.span
              aria-hidden
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mint"
              style={{ boxShadow: '0 0 0 5px var(--ink)' }}
              initial={{ left: '0%' }}
              animate={inView ? { left: '100%' } : {}}
              transition={{ duration: 2.4, ease: EASE, delay: 0.9 }}
            />
          </div>
        </div>

        <footer className="mt-16 flex flex-col gap-6 border-t border-white/10 pt-8 text-[13px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="iSTARTUP home" className="w-fit rounded-sm">
            <Mark inverse />
          </Link>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/start" className="transition-colors hover:text-paper">
              Submit an idea
            </Link>
            <Link href="/sign-in" className="transition-colors hover:text-paper">
              Log in
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} ScienceWerx. iSTARTUP.</p>
        </footer>
      </div>
    </section>
  );
}
