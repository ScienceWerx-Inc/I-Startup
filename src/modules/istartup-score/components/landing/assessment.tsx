'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

import { EASE_OUT, Reveal } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { AssessmentQuestion } from './assessment-question';
import { container } from './ui';

const STEPS = [
  { n: '01', title: 'Profile your startup', status: 'Done' },
  { n: '02', title: 'Answer tailored questions', status: 'In progress' },
  { n: '03', title: 'Get your score', status: 'Up next' },
] as const;

const CURRENT = 1;

/** A white section that rises out of the canvas: top corners domed, bottom flat. */
export function Assessment() {
  return (
    <section id="how-it-works" className="section-y scroll-mt-24 rounded-t-arc bg-surface">
      <div className={cn(container, 'grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 xl:gap-24')}>
        <div>
          <Reveal>
            <p className="kicker">How it works</p>
            <h2 className="display-lg mt-6 text-fg">A structured assessment, not a questionnaire.</h2>
            <p className="lead mt-6 max-w-[32rem]">
              Every question offers a few concise descriptions instead of a vague 1–5 rating, so your answer is a data
              point you can stand behind — and you’ll see how it impacts your score in real time.
            </p>
          </Reveal>
          <StepProgress />
        </div>

        <Reveal delay={120}>
          <AssessmentQuestion />
        </Reveal>
      </div>
    </section>
  );
}

/** Three steps on a rail; the rail fills to the current step when scrolled into view. */
function StepProgress() {
  return (
    <motion.ol
      className="relative mt-12 grid grid-cols-3 gap-3"
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.5 }}
    >
      {/* Rail from the first node's centre to the last (nodes are 32px, columns gap 12px). */}
      <span aria-hidden className="absolute left-4 top-4 h-0.5 w-[calc(66.667%+8px)] -translate-y-1/2 rounded-full bg-edge">
        <motion.span
          className="absolute inset-0 origin-left rounded-full bg-fg"
          variants={{ hidden: { scaleX: 0 }, shown: { scaleX: CURRENT / (STEPS.length - 1) } }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.2 }}
        />
      </span>

      {STEPS.map((s, i) => {
        const done = i < CURRENT;
        const current = i === CURRENT;
        return (
          <motion.li
            key={s.n}
            className="relative"
            aria-current={current ? 'step' : undefined}
            variants={{ hidden: { opacity: 0, y: 8 }, shown: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.1 + i * 0.15 }}
          >
            <span
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs tabular',
                done && 'bg-fg text-accent-ink',
                current && 'bg-fund-soft text-fg ring-2 ring-fg',
                !done && !current && 'bg-surface-2 text-fg-muted',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s.n}
            </span>
            <p className="mt-4 font-mono text-xs tracking-[-0.03em] text-fg-muted">{s.n}</p>
            <p className="mt-1 text-sm font-medium leading-snug text-fg sm:text-base">{s.title}</p>
            <p className={cn('mt-1 text-xs', current ? 'font-semibold text-fg' : 'text-fg-muted')}>{s.status}</p>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
