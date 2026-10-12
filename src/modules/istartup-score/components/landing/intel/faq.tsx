'use client';

import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Accent, SectionHeading, useTiming, wrap } from './primitives';

/**
 * Plain answers to what the sections above leave open. Nothing here promises funding,
 * certifications, or access controls the product does not have.
 */

const QA = [
  {
    q: 'Who can use the platform?',
    a: 'Founders assessing their own startup, and the program reviewers who read completed reports. Founders create an account at the end of the short “Submit an idea” onboarding, then take the assessment signed in.',
  },
  {
    q: 'Does a high score guarantee funding?',
    a: 'No. The score measures readiness against a fixed set of criteria. It can support a conversation with funders, but it does not approve funding, predict returns, or replace due diligence.',
  },
  {
    q: "Can funders access every startup's results?",
    a: 'There is no directory of startups or scores for funders to browse. Completed reports are archived for the program that runs the assessment, and are reviewed alongside the application they are linked to.',
  },
  {
    q: 'How is startup data handled?',
    a: 'Your account holds your name and email; passwords are stored hashed. While you work, answers stay in your browser so you can resume. When you finish, the report — your profile, answers and scores, with an approximate location (country, region and city) — is saved to your account, and with your application if you linked one. Payments are processed by Stripe.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  const t = useTiming();

  return (
    <section id="faq" aria-labelledby="faq-title" className="bi-y scroll-mt-16">
      <div className={cn(wrap, 'grid gap-x-14 gap-y-10 lg:grid-cols-12')}>
        <div className="lg:col-span-4">
          <SectionHeading
            id="faq-title"
            eyebrow="FAQ"
            title={
              <>
                Questions, <Accent>answered.</Accent>
              </>
            }
          />
        </div>
        <div className="border-t border-line lg:col-span-8">
          {QA.map((item, i) => {
            const isOpen = open === i;
            const btn = `${base}-q${i}`;
            const panel = `${base}-a${i}`;
            return (
              <div key={item.q} className="border-b border-line">
                <h3>
                  <button
                    id={btn}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panel}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="bi-h3 flex w-full items-center justify-between gap-6 py-5 text-left text-ink transition-colors hover:text-funder"
                  >
                    {item.q}
                    <Plus
                      aria-hidden
                      className={cn('h-5 w-5 shrink-0 text-mut transition-transform duration-200', isOpen && 'rotate-45')}
                      strokeWidth={2}
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panel}
                      role="region"
                      aria-labelledby={btn}
                      className="overflow-hidden"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={t(0, 0.25)}
                    >
                      <p className="max-w-[44rem] pb-5 text-[15px] leading-relaxed text-mut">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
