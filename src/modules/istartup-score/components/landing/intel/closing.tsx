'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';

import { cn } from '@/lib/utils';
import { Wordmark } from '../../chrome';
import { NAV_LINKS } from './site-nav';
import { ASSESSMENT_HREF, Accent, ButtonLink, ConnectionPath, DataNode, REVIEWER_HREF, SIGN_IN_HREF, VIEW, useTiming, wrap } from './primitives';

/** The final call to action, on navy, with a faint network behind it. */
export function Closing() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, VIEW);
  const t = useTiming();

  return (
    <section aria-labelledby="closing-title" className="bi-dark-hero relative overflow-hidden bg-ink text-on-dark">
      <Backdrop on={on} />
      <div ref={ref} className={cn(wrap, 'relative bi-y text-center')}>
        <motion.div
          className="mx-auto max-w-[44rem]"
          initial={{ opacity: 0, y: 14 }}
          animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={t(0, 0.55)}
        >
          <h2 id="closing-title" className="bi-h2 text-balance">
            Clarity for founders. <Accent dark>Insight for funders.</Accent>
          </h2>
          <p className="bi-lead mx-auto mt-5 max-w-[34rem] text-on-dark-muted">
            Whether you&apos;re building a startup or evaluating one, make business readiness easier to understand.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href={ASSESSMENT_HREF} variant="inverse" arrow>
              Assess Your Startup
            </ButtonLink>
            <ButtonLink href="#funders" variant="outlineDark">
              Explore for Funders
            </ButtonLink>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/** A few nodes and paths at the edges, kept clear of the text. */
function Backdrop({ on }: { on: boolean }) {
  const paths = [
    'M -20 60 C 120 40, 160 140, 260 120',
    'M 260 120 C 330 110, 340 230, 200 260',
    'M 1220 40 C 1100 60, 1080 170, 960 150',
    'M 960 150 C 900 140, 920 260, 1040 280',
  ];
  const nodes = [
    { x: 260, y: 120 },
    { x: 200, y: 260 },
    { x: 960, y: 150 },
    { x: 1040, y: 280 },
  ];
  return (
    <svg aria-hidden viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full opacity-60 max-md:hidden">
      {paths.map((d, i) => (
        <ConnectionPath key={d} d={d} tone="white" width={1} on={on} delay={0.2 + i * 0.15} duration={1.1} />
      ))}
      {nodes.map((n, i) => (
        <DataNode key={i} x={n.x} y={n.y} r={3.5} tone={i % 2 ? 'white' : 'mint'} ring="var(--ink)" on={on} delay={0.8 + i * 0.1} />
      ))}
    </svg>
  );
}

export function Footer() {
  const groups = [
    { title: 'Platform', links: NAV_LINKS.map((l) => ({ label: l.label, href: l.href })) },
    {
      title: 'For founders',
      links: [
        { label: 'Start your assessment', href: ASSESSMENT_HREF },
        { label: 'Sign in', href: SIGN_IN_HREF },
        { label: 'FAQ', href: '#faq' },
      ],
    },
    {
      title: 'For funders',
      links: [
        { label: 'How reports are read', href: '#funders' },
        { label: 'Reviewer sign in', href: REVIEWER_HREF },
      ],
    },
  ];

  return (
    <footer className="border-t border-on-dark-line bg-ink text-on-dark-muted">
      <div className={cn(wrap, 'grid gap-10 py-14 md:grid-cols-12')}>
        <div className="md:col-span-4">
          <Link href="/" aria-label="iStartup Score home" className="inline-block rounded-md text-on-dark">
            <Wordmark inverse eager={false} className="h-[26px] sm:h-[30px]" />
          </Link>
          <p className="mt-4 max-w-[22rem] text-[14px] leading-relaxed">
            A structured assessment of startup readiness — for founders deciding what to work on, and for the reviewers
            who read their results.
          </p>
        </div>
        {groups.map((g, i) => (
          <nav key={g.title} aria-label={g.title} className={cn('md:col-span-2', i === 0 && 'md:col-start-7')}>
            <p className="text-[13px] font-semibold text-on-dark">{g.title}</p>
            <ul className="mt-4 grid gap-2.5">
              {g.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-[14px] transition-colors duration-200 hover:text-on-dark">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className={cn(wrap, 'flex flex-col gap-2 border-t border-on-dark-line py-6 text-[13px] sm:flex-row sm:justify-between')}>
        <p>© {new Date().getFullYear()} ScienceWerx. iStartup Score.</p>
        <p>Results on this page are illustrative examples.</p>
      </div>
    </footer>
  );
}
