import { Coins, FileChartColumn, Route } from 'lucide-react';

import { Reveal } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { card, cardHover, container } from './ui';

const BENEFITS = [
  {
    n: '01',
    title: 'Unlock non-dilutive capital',
    description: 'A strong iSTARTUP Score can support readiness for grants, programs and innovation initiatives.',
    icon: Coins,
  },
  {
    n: '02',
    title: 'Streamlined PNPL onboarding',
    description: 'Boost your readiness for accelerators, incubators and corporate partnerships.',
    icon: FileChartColumn,
  },
  {
    n: '03',
    title: 'A roadmap, not just a number',
    description: 'Know where you stand and what to focus on next.',
    icon: Route,
  },
];

export function Benefits() {
  return (
    <section id="use-cases" className="section-y scroll-mt-20">
      <div className={container}>
        <Reveal className="max-w-3xl">
          <p className="kicker">Why it matters</p>
          <h2 className="display-lg mt-4 text-fg">
            A strong idea is not enough. <span className="text-fg-muted">Investors need proof of execution.</span>
          </h2>
          <p className="lead mt-6 max-w-[34rem]">
            The iSTARTUP Score helps you turn your idea into a compelling, data-backed story with clear next steps.
          </p>
        </Reveal>

        <ul className="mt-14 grid gap-4 md:grid-cols-3 md:gap-5">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <Reveal key={b.n} as="li" delay={i * 80} className="h-full">
                <div className={cn(card, cardHover, 'flex h-full flex-col p-6 sm:p-7')}>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-tile bg-blue-soft text-blue">
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-fg-muted tabular">{b.n}</span>
                  </div>
                  <h3 className="mt-10 text-xl font-bold tracking-[-0.02em] text-fg">{b.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{b.description}</p>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
