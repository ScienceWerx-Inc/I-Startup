'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { MessageCircleQuestionMark } from 'lucide-react';

import { cn } from '@/lib/utils';
import { INVESTOR_QUESTIONS } from './example';
import { QUESTION_ICON } from './icons';
import { EASE, IconTile, Reveal, SectionIndex, wrap } from './shared';

/**
 * Funding readiness: not "will you get funded", but "how prepared are you for the
 * conversation". Shown as the questions investors ask, which ones the example startup
 * can answer today, and where that places it on one line.
 */

const ZONES = ['Not yet', 'Getting close', 'Ready to talk'];

export function Readiness() {
  const ready = INVESTOR_QUESTIONS.filter((q) => q.ready).length;
  const total = INVESTOR_QUESTIONS.length;
  const position = ready / total;

  const lineRef = useRef<HTMLDivElement>(null);
  const inView = useInView(lineRef, { once: true, margin: '-15% 0px' });

  return (
    <section id="prepare" aria-labelledby="readiness-title" className="ed-y scroll-mt-16 border-t border-hair">
      <div className={wrap}>
        <SectionIndex index="05" stage="Prepare" />

        <div className="mt-10 grid grid-cols-12 gap-x-6 gap-y-10 lg:mt-14">
          <Reveal className="col-span-12 lg:col-span-9">
            <h2 id="readiness-title" className="ed-h2 text-balance">
              Ready for your next funding conversation?
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="col-span-12 md:col-span-8 lg:col-span-5">
            <p className="ed-lead text-pretty">
              Investors ask the same handful of questions. iSTARTUP shows which ones you can answer today —
              and which ones will stall the room.
            </p>
          </Reveal>
        </div>

        {/* Where you stand on the conversation */}
        <div ref={lineRef} className="mt-14 lg:mt-16">
          <div className="flex items-baseline justify-between gap-4">
            <p className="ed-label text-mut">Funding readiness · example startup</p>
            <p className="text-[14px] text-mut">
              <span className="ed-num text-[1.125rem] font-medium text-ink">
                {ready} of {total}
              </span>{' '}
              questions answered
            </p>
          </div>

          <div className="relative mt-10 h-14">
            <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-hair-strong" />
            <motion.div
              aria-hidden
              className="absolute left-0 top-1/2 h-px bg-ink"
              initial={{ width: 0 }}
              animate={inView ? { width: `${position * 100}%` } : {}}
              transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}
            />
            {ZONES.map((z, i) => {
              const at = i / (ZONES.length - 1);
              return (
                <div
                  key={z}
                  className="absolute top-0 h-full"
                  style={i === ZONES.length - 1 ? { right: 0 } : { left: `${at * 100}%` }}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-1/2 h-[9px] w-px -translate-y-1/2 bg-hair-strong',
                      i === ZONES.length - 1 ? 'right-0' : 'left-0',
                    )}
                  />
                  <span
                    className={cn(
                      'absolute top-[calc(50%+14px)] whitespace-nowrap text-[13px] font-medium',
                      i === 0 ? 'left-0' : i === ZONES.length - 1 ? 'right-0' : '-translate-x-1/2',
                      i === 1 ? 'text-ink' : 'text-faint',
                    )}
                  >
                    {z}
                  </span>
                </div>
              );
            })}
            <motion.span
              aria-hidden
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mint"
              style={{ boxShadow: '0 0 0 5px var(--paper)' }}
              initial={{ left: '0%' }}
              animate={inView ? { left: `${position * 100}%` } : {}}
              transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}
            />
          </div>
        </div>

        {/* The questions */}
        <ul className="mt-14 grid border-t border-hair md:grid-cols-2 md:gap-x-12 lg:mt-16">
          {INVESTOR_QUESTIONS.map((q, i) => (
            <motion.li
              key={q.ask}
              className="group flex items-center gap-4 border-b border-hair py-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-8% 0px' }}
              transition={{ duration: 0.7, ease: EASE, delay: (i % 3) * 0.08 }}
            >
              <IconTile icon={QUESTION_ICON[q.ask] ?? MessageCircleQuestionMark} tone={q.ready ? 'mint' : 'amber'} size={28} />
              <span className="font-headline flex-1 text-[clamp(1.125rem,1rem+0.5vw,1.375rem)] tracking-[-0.02em] text-ink">
                “{q.ask}”
              </span>
              <span className="text-right text-[13px] leading-snug">
                <span className={cn('block font-medium', q.ready ? 'text-mint-ink' : 'text-amber-ink')}>
                  {q.ready ? 'Ready' : 'Not yet'}
                </span>
                <span className="block text-mut opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-md:opacity-100">
                  {q.because}
                </span>
              </span>
            </motion.li>
          ))}
        </ul>

        <Reveal>
          <p className="mt-12 max-w-[34rem] text-[14px] leading-relaxed text-mut">
            Readiness isn’t a promise of funding. It’s knowing what they’ll ask — and whether you already
            have the answer.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
