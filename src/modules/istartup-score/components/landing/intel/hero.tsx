'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { ASSESSMENT_HREF, Accent, ButtonLink, Eyebrow, useTiming, wrap } from './primitives';

/**
 * Copy first, then the photo. The copy and both audience CTAs are real HTML and readable
 * within half a second. From 1280px the photo fills the hero behind them, uncropped and
 * pinned right, and a white gradient behind the copy carries the page into it; below that
 * it runs edge to edge under the copy, fading in from white at the top.
 */

/** Without JavaScript, everything marked data-reveal shows in its final state. */
const NO_SCRIPT_CSS = '<style>[data-reveal]{opacity:1!important;transform:none!important}</style>';

/**
 * White behind the copy, clearing before the people; and a soft fade into the next section.
 * The stops are measured from the centre, so they follow the copy column (it ends at
 * 50% − 88px) at every width rather than drifting away from it on wide screens.
 */
const DESKTOP_FADE =
  'linear-gradient(90deg, var(--paper) 0%, var(--paper) calc(50% - 150px), color-mix(in oklab, var(--paper) 78%, transparent) calc(50% - 60px), transparent calc(50% + 60px)), linear-gradient(0deg, var(--paper) 0%, transparent 16%)';
const STACKED_FADE = 'linear-gradient(180deg, var(--paper) 0%, transparent 28%)';
/** On very wide screens the photo's own left edge falls in view; this keeps it soft. */
const EDGE_FADE = 'linear-gradient(90deg, var(--paper) 0%, transparent 18%)';

export function Hero() {
  const t = useTiming();
  const up = (delay: number) => ({
    'data-reveal': true,
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: t(delay, 0.55),
  });

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden xl:flex xl:min-h-[600px] xl:items-center">
      <noscript dangerouslySetInnerHTML={{ __html: NO_SCRIPT_CSS }} />
      <div className={cn(wrap, 'relative z-10 pb-10 pt-10 sm:pt-14 xl:py-16')}>
        <div className="max-w-[600px] xl:max-w-[500px]">
          <motion.div {...up(0)}>
            <Eyebrow>Startup assessment &amp; business intelligence</Eyebrow>
          </motion.div>
          <motion.h1 id="hero-title" className="bi-h1 mt-5 text-ink" {...up(0.06)}>
            Turn Business <br className="hidden sm:block" />
            Potential <Accent>Into</Accent> <br className="hidden sm:block" />
            <Accent>Progress.</Accent>
          </motion.h1>
          <motion.p className="bi-lead mt-6 text-pretty text-mut" {...up(0.14)}>
            Whether you&apos;re building a startup or evaluating one, iStartup Score helps you understand business
            readiness, uncover opportunities, and make more informed decisions.
          </motion.p>
          <motion.div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap [&>a]:whitespace-nowrap" {...up(0.22)}>
            <ButtonLink href={ASSESSMENT_HREF} variant="ink" arrow className="h-[54px]">
              I&apos;m a Startup Founder
            </ButtonLink>
            <ButtonLink href="#funders" variant="secondary" arrow className="h-[54px]">
              I&apos;m a Funder
            </ButtonLink>
          </motion.div>
        </div>
      </div>

      <motion.div className="relative aspect-[4/3] sm:aspect-[1690/931] xl:absolute xl:inset-y-0 xl:right-0 xl:h-full xl:aspect-[1690/931]" {...up(0.1)}>
        <Image
          src="/brand/hero-presentation.webp"
          alt="A founder presenting a business overview dashboard on a large screen to a colleague in a meeting room overlooking the city"
          fill
          sizes="(min-width: 1280px) 1200px, 100vw"
          loading="eager"
          fetchPriority="high"
          quality={85}
          className="object-cover object-[96%_50%] sm:object-center"
        />
        <div aria-hidden className="absolute inset-0 xl:hidden" style={{ background: STACKED_FADE }} />
        <div aria-hidden className="absolute inset-0 hidden xl:block" style={{ background: EDGE_FADE }} />
      </motion.div>
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block" style={{ background: DESKTOP_FADE }} />
    </section>
  );
}
