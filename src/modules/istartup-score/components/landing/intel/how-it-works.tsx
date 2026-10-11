'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import { ClipboardList, FileText, Gauge, ListOrdered, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { BAND_LABELS, DIMENSION_COUNT, MAX_SCORE, QUESTION_COUNT } from './data';
import { SectionHeading, VIEW, useDelay, useTiming, wrap } from './primitives';

/**
 * Four stages on one path. The line draws forward as the section arrives and each
 * stage switches on as the line reaches it. The text is visible from the start; only
 * the indicators wait for the line.
 */

const STEPS: { title: string; body: string; icon: LucideIcon; visual: (on: boolean) => ReactNode }[] = [
  {
    title: 'Evaluate the business',
    body: `Answer ${QUESTION_COUNT} questions across ${DIMENSION_COUNT} weighted dimensions. Each answer is a concrete description you recognise, not a 1–5 guess.`,
    icon: ClipboardList,
    visual: (on) => <Options on={on} />,
  },
  {
    title: 'Understand the results',
    body: `See a score out of ${MAX_SCORE}, a result for every dimension, and where that places you — from early stage to investment ready.`,
    icon: Gauge,
    visual: (on) => <Bands on={on} />,
  },
  {
    title: 'Identify what to improve',
    body: 'Gaps are ranked by how many points each would recover, and every one comes with a specific next step.',
    icon: ListOrdered,
    visual: (on) => <Ranked on={on} />,
  },
  {
    title: 'Support better decisions',
    body: 'Unlock the full report to keep it as a PDF; a report linked to an application is archived with it for reviewers.',
    icon: FileText,
    visual: (on) => <Report on={on} />,
  },
];

const LINE = 1.4; // seconds for the line to cross all four stages
const reach = (i: number) => 0.2 + (LINE * i) / (STEPS.length - 1);

export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null);
  const on = useInView(ref, VIEW);
  const t = useTiming();
  const delay = useDelay();

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="bi-y scroll-mt-16 bg-mist">
      <div className={wrap}>
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="From assessment to actionable insight."
          lead="One structured pass through the business, and a report that says what to do next."
        />

        <ol ref={ref} className="relative mt-12 grid gap-10 lg:mt-16 lg:grid-cols-4 lg:gap-8">
          {/* The path: horizontal through the stage markers on desktop, vertical on smaller screens. */}
          <span aria-hidden className="absolute left-[19px] top-5 bottom-5 w-px bg-line lg:hidden" />
          <motion.span
            aria-hidden
            className="absolute left-[19px] top-5 bottom-5 w-[2px] origin-top bg-gradient-to-b from-mint to-teal lg:hidden"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: on ? 1 : 0 }}
            transition={t(0.2, LINE, { ease: 'linear' })}
          />
          <span aria-hidden className="absolute left-5 right-[calc(25%-1.5rem)] top-5 hidden h-px bg-line lg:block" />
          <motion.span
            aria-hidden
            className="absolute left-5 right-[calc(25%-1.5rem)] top-5 hidden h-[2px] origin-left bg-gradient-to-r from-mint to-teal lg:block"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: on ? 1 : 0 }}
            transition={t(0.2, LINE, { ease: 'linear' })}
          />

          {STEPS.map((s, i) => (
            <li key={s.title} className="relative grid grid-cols-[40px_1fr] gap-x-5 lg:block">
              <span
                className={cn(
                  'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-[14px] font-semibold tabular-nums transition-colors duration-300',
                  on ? 'border-ink bg-ink text-on-dark' : 'border-line-strong bg-paper text-mut',
                )}
                style={delay(reach(i))}
              >
                {i + 1}
              </span>
              <div className="lg:mt-6">
                <div className="flex items-center gap-2.5 text-funder">
                  <s.icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                  <h3 className="bi-h3 text-ink">{s.title}</h3>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-mut lg:max-w-[17rem]">{s.body}</p>
                <div className="mt-5 max-w-[17rem]">{s.visual(on)}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* Small indicators, one per stage. Each switches on when the line reaches it. */

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-tile border border-line bg-surface p-3.5 shadow-card', className)}>{children}</div>;
}

function Options({ on }: { on: boolean }) {
  const delay = useDelay();
  return (
    <Panel>
      <p className="bi-data text-mut">Which describes you today?</p>
      <div className="mt-2.5 grid gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'flex h-6 items-center gap-2 rounded-md border px-2 transition-colors duration-300',
              on && i === 1 ? 'border-mint bg-mint-soft' : 'border-line',
            )}
            style={delay(reach(0) + 0.3)}
          >
            <span
              className={cn('h-2 w-2 rounded-full border transition-colors duration-300', on && i === 1 ? 'border-mint bg-mint' : 'border-line-strong')}
              style={delay(reach(0) + 0.3)}
            />
            <span className="h-1.5 rounded-full bg-mist" style={{ width: `${[70, 85, 55][i]}%` }} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Bands({ on }: { on: boolean }) {
  const delay = useDelay();
  return (
    <Panel>
      <div className="grid grid-cols-4 gap-1">
        {BAND_LABELS.map((b, i) => (
          <span
            key={b}
            className={cn(
              'h-2 rounded-full transition-colors duration-300',
              on && i === 2 ? 'bg-mint' : on && i < 2 ? 'bg-funder-soft' : 'bg-mist',
            )}
            style={delay(reach(1) + i * 0.08)}
          />
        ))}
      </div>
      <div className="bi-data mt-2.5 flex justify-between text-mut">
        <span>0</span>
        <span>{MAX_SCORE}</span>
      </div>
      <p className="bi-data mt-1 text-mut">
        {BAND_LABELS.length} bands, from {BAND_LABELS[0].toLowerCase()} to {BAND_LABELS[BAND_LABELS.length - 1].toLowerCase()}
      </p>
    </Panel>
  );
}

function Ranked({ on }: { on: boolean }) {
  const t = useTiming();
  return (
    <Panel>
      {[92, 64, 40].map((w, i) => (
        <div key={w} className="flex items-center gap-2 py-1">
          <span className="bi-data w-4 text-mut">{i + 1}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist">
            <motion.div
              className="h-full origin-left rounded-full bg-amber"
              style={{ width: `${w}%` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: on ? 1 : 0 }}
              transition={t(reach(2) + i * 0.1, 0.5)}
            />
          </div>
        </div>
      ))}
      <p className="bi-data mt-1.5 text-mut">Ranked by points recoverable</p>
    </Panel>
  );
}

function Report({ on }: { on: boolean }) {
  const t = useTiming();
  return (
    <motion.div
      initial={{ opacity: 0.4, y: 6 }}
      animate={on ? { opacity: 1, y: 0 } : { opacity: 0.4, y: 6 }}
      transition={t(reach(3), 0.5)}
    >
      <Panel className="flex items-center gap-3">
        <span className="flex h-10 w-8 shrink-0 flex-col justify-center gap-1 rounded-[4px] border border-line bg-mist px-1.5">
          <span className="h-1 rounded-full bg-funder" />
          <span className="h-1 w-3/4 rounded-full bg-line-strong" />
          <span className="h-1 rounded-full bg-line-strong" />
        </span>
        <span>
          <span className="block text-[13px] font-semibold text-ink">Report ready</span>
          <span className="bi-data block text-mut">Score · dimensions · actions</span>
        </span>
      </Panel>
    </motion.div>
  );
}
