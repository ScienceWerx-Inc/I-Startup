'use client';

import { motion } from 'framer-motion';

import { REPORT_ICON } from './icons';
import { EASE, IconTile, Point, Reveal, SectionIndex, wrap } from './shared';

/**
 * Five things the report gives you beyond the number. Each row's point carries the
 * colour it keeps for the rest of the page: mint is working, amber is a gap, blue is a
 * next step, ink is explanation.
 */
const ITEMS = [
  {
    term: 'Strengths',
    tone: 'mint',
    note: 'What’s genuinely working — the parts an investor will lean in on.',
  },
  {
    term: 'Gaps',
    tone: 'amber',
    note: 'What’s missing or unproven, ranked by how much it holds you back.',
  },
  {
    term: 'Insights',
    tone: 'ink',
    note: 'Why your score is what it is, in plain language. No jargon, no hedging.',
  },
  {
    term: 'Recommendations',
    tone: 'signal',
    note: 'Specific next steps, tied to the gaps that matter most.',
  },
  {
    term: 'Funding readiness',
    tone: 'mint',
    note: 'How prepared you are for an investor conversation — today, not someday.',
  },
] as const;

export function BeyondScore() {
  return (
    <section id="understand" aria-labelledby="beyond-title" className="ed-y scroll-mt-16">
      <div className={wrap}>
        <SectionIndex index="02" stage="Understand" />

        <div className="mt-10 grid grid-cols-12 gap-x-6 gap-y-12 lg:mt-14">
          <div className="col-span-12 lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <Reveal>
                <h2 id="beyond-title" className="ed-h2 text-balance">
                  More than a score.
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="ed-lead mt-8 max-w-[26rem] text-pretty">
                  A number tells you where you are. Everything around it tells you why — and what to do
                  about it.
                </p>
              </Reveal>

              {/* The score, deliberately small: the start of the story, not the story. */}
              <Reveal delay={0.2} className="mt-14 hidden items-baseline gap-3 border-t border-hair pt-6 lg:flex">
                <span className="ed-num text-[2rem] leading-none text-faint">
                  312<span className="text-[1rem] tracking-normal"> / 500</span>
                </span>
                <span className="text-[14px] text-mut">is a score. The rest is the assessment.</span>
              </Reveal>
            </div>
          </div>

          <ol className="col-span-12 border-t border-hair lg:col-span-7">
            {ITEMS.map((item, i) => (
              <motion.li
                key={item.term}
                className="group relative border-b border-hair"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-8% 0px' }}
                transition={{ duration: 0.8, ease: EASE, delay: i * 0.07 }}
              >
                {/* Hover: a line draws across, the point moves into position. */}
                <span
                  aria-hidden
                  className="absolute -bottom-px left-0 h-px w-full origin-left scale-x-0 bg-ink transition-transform duration-700 ease-out group-hover:scale-x-100"
                />
                <div
                  tabIndex={0}
                  className="grid grid-cols-[2.75rem_1fr] items-start gap-x-4 py-7 outline-none sm:grid-cols-[3.5rem_1fr] md:py-9"
                >
                  <IconTile icon={REPORT_ICON[item.term]} tone={item.tone} size={32} className="mt-0.5" />
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)] md:items-baseline md:gap-8">
                    <h3 className="ed-h3 relative flex items-center transition-transform duration-500 ease-out group-hover:translate-x-7 group-focus-within:translate-x-7">
                      <span className="absolute -left-7 top-1/2 -translate-y-1/2 scale-0 opacity-0 transition-all duration-500 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100">
                        <Point tone={item.tone} size={11} ring="none" />
                      </span>
                      {item.term}
                    </h3>
                    <p className="text-[15px] leading-relaxed text-mut transition-colors duration-500 group-hover:text-ink md:text-[16px]">
                      {item.note}
                    </p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
