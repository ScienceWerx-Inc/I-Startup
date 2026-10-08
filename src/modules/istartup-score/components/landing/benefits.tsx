import { Reveal } from '@/components/reveal';
import { cn } from '@/lib/utils';

import { GrantCapital, PlugIn, RoadmapPath } from './illustrations/scenes';
import { card, container } from './ui';

const BENEFITS = [
  {
    n: '01',
    title: 'Unlock non-dilutive capital',
    description: 'A strong iSTARTUP Score can support readiness for grants, programs and innovation initiatives.',
    illustration: GrantCapital,
  },
  {
    n: '02',
    title: 'Streamlined PNPL onboarding',
    description: 'Boost your readiness for accelerators, incubators and corporate partnerships.',
    illustration: PlugIn,
  },
  {
    n: '03',
    title: 'A roadmap, not just a number',
    description: 'Know where you stand and what to focus on next.',
    illustration: RoadmapPath,
  },
];

export function Benefits() {
  return (
    <section id="use-cases" className="section-y scroll-mt-24">
      <div className={container}>
        <Reveal className="max-w-3xl">
          <p className="kicker">Why it matters</p>
          <h2 className="display-lg mt-6 text-fg">A strong idea is not enough. Investors need proof of execution.</h2>
          <p className="lead mt-6 max-w-[34rem]">
            The iSTARTUP Score helps you turn your idea into a compelling, data-backed story with clear next steps.
          </p>
        </Reveal>

        <ul className="mt-14 grid gap-4 md:grid-cols-3 md:gap-5">
          {BENEFITS.map((b, i) => {
            const Illustration = b.illustration;
            return (
            <Reveal key={b.n} as="li" delay={i * 80} className="h-full">
              <div className={cn(card, 'flex h-full flex-col p-3 sm:p-4')}>
                <div className="aspect-[4/3] w-full overflow-hidden rounded-card bg-mist px-6 py-4">
                  <Illustration className="h-full w-full" />
                </div>
                <div className="flex flex-1 flex-col px-3 pb-4 pt-6 sm:px-4">
                  <span className="font-mono text-xs tracking-[-0.03em] text-fg-muted tabular">{b.n}</span>
                  <h3 className="mt-3 text-[22px] font-medium leading-[1.2] tracking-[-0.03em] text-fg">{b.title}</h3>
                  <p className="mt-3 text-base leading-[1.45] text-fg-muted">{b.description}</p>
                </div>
              </div>
            </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
