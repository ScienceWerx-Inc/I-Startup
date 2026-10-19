'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { motion, useReducedMotion, useSpring } from 'framer-motion';
import { Clock, Quote, Sparkles } from 'lucide-react';

import { proseBlocks, proseSegments, readingMinutes } from '@/lib/lessons/prose';
import type { ProseBlock } from '@/lib/lessons/prose';
import { cn } from '@/lib/utils';

/**
 * The reading view of a lesson body.
 *
 * The body is plain prose (see lib/lms/lesson-prose.ts for how it is given
 * shape). Here it gets a reading measure (~68 characters a line), a lead
 * paragraph with a drop cap, real hierarchy for headings, lists and the
 * lifted takeaway, and inline terms picked out. Blocks rise in as they scroll
 * into view and a thin bar tracks how far through the reading you are.
 * Text size is the learner's, remembered in this browser. All motion collapses
 * under prefers-reduced-motion.
 */

type Size = 'sm' | 'md' | 'lg';
const SIZE_KEY = 'lesson-text-size';

const SIZES: Record<Size, { lead: string; body: string; takeaway: string; heading: string }> = {
  sm: { lead: 'text-[17px] leading-8', body: 'text-[15px] leading-7', takeaway: 'text-lg', heading: 'text-lg' },
  md: { lead: 'text-lg leading-8 sm:text-xl sm:leading-9', body: 'text-[17px] leading-8', takeaway: 'text-xl', heading: 'text-xl' },
  lg: { lead: 'text-xl leading-9 sm:text-2xl sm:leading-10', body: 'text-[19px] leading-9', takeaway: 'text-2xl', heading: 'text-2xl' },
};

/** The remembered text size, read from storage like an external store (no effect, no flash). */
const SIZE_EVENT = 'lesson-text-size-change';
let sessionSize: Size = 'md';
function readSize(): Size {
  try {
    const saved = window.localStorage.getItem(SIZE_KEY);
    if (saved === 'sm' || saved === 'md' || saved === 'lg') return saved;
  } catch {
    /* storage blocked: fall back to this session's choice */
  }
  return sessionSize;
}
function rememberSize(next: Size) {
  sessionSize = next;
  try {
    window.localStorage.setItem(SIZE_KEY, next);
  } catch {
    /* just not remembered across visits */
  }
  window.dispatchEvent(new Event(SIZE_EVENT));
}
function subscribeSize(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener('storage', handler);
  window.addEventListener(SIZE_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(SIZE_EVENT, handler);
  };
}

export function LessonProse({ body }: { body: string }) {
  const reduceMotion = useReducedMotion() ?? false;
  const blocks = useMemo(() => proseBlocks(body), [body]);
  const minutes = useMemo(() => readingMinutes(body), [body]);
  const size = useSyncExternalStore(subscribeSize, readSize, () => 'md' as Size);
  const chooseSize = rememberSize;

  // Progress: the furthest block that has been read into view, so it works in
  // whichever element scrolls the page.
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [furthest, setFurthest] = useState(-1);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = Number((entry.target as HTMLElement).dataset.block);
          setFurthest((f) => Math.max(f, i));
        }
      },
      { rootMargin: '0px 0px -35% 0px' },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [blocks]);
  const progress = useSpring(0, { stiffness: 120, damping: 24 });
  useEffect(() => {
    progress.set(blocks.length ? (furthest + 1) / blocks.length : 0);
  }, [furthest, blocks.length, progress]);

  const s = SIZES[size];

  return (
    <div className="relative">
      {/* Reading toolbar: time, and the learner's text size. */}
      <div className="sticky top-16 z-10 -mx-6 -mt-6 mb-8 rounded-t-xl border-b border-line bg-surface/90 px-6 py-3 backdrop-blur sm:-mx-10 sm:-mt-10 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-mut">
            <Clock className="h-3.5 w-3.5" />
            {minutes} min read
          </span>
          <div role="group" aria-label="Text size" className="inline-flex items-center rounded-lg border border-line bg-mist/40 p-0.5">
            {(['sm', 'md', 'lg'] as const).map((value, i) => (
              <button
                key={value}
                type="button"
                aria-pressed={size === value}
                aria-label={['Small text', 'Medium text', 'Large text'][i]}
                onClick={() => chooseSize(value)}
                className={cn(
                  'rounded-md px-2 py-0.5 font-semibold leading-6 transition-colors',
                  ['text-[11px]', 'text-[13px]', 'text-[15px]'][i],
                  size === value ? 'bg-surface text-ink shadow-sm' : 'text-mut hover:text-ink',
                )}
              >
                A
              </button>
            ))}
          </div>
        </div>
        <motion.div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-tech via-sky-400 to-emerald-400"
          style={{ scaleX: progress }}
        />
      </div>

      <div className="mx-auto max-w-[68ch] space-y-6">
        {blocks.map((block, i) => (
          <motion.div
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-block={i}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -8% 0px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Block block={block} s={s} reduceMotion={reduceMotion} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Block({
  block,
  s,
  reduceMotion,
}: {
  block: ProseBlock;
  s: (typeof SIZES)[Size];
  reduceMotion: boolean;
}) {
  switch (block.kind) {
    case 'lead':
      return (
        <p
          className={cn(
            s.lead,
            'font-medium text-ink',
            'first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:bg-gradient-to-br first-letter:from-tech first-letter:to-sky-400 first-letter:bg-clip-text first-letter:text-[3.6em] first-letter:font-extrabold first-letter:leading-[0.8] first-letter:text-transparent',
          )}
        >
          <Inline text={block.text} />
        </p>
      );
    case 'paragraph':
      return (
        <p className={cn(s.body, 'text-ink/80')}>
          <Inline text={block.text} />
        </p>
      );
    case 'heading':
      return (
        <h2 className={cn(s.heading, 'flex items-center gap-3 pt-4 font-bold tracking-tight text-ink')}>
          <span className="h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-tech to-sky-400" aria-hidden />
          {block.text}
        </h2>
      );
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul';
      return (
        <List className={cn(s.body, 'space-y-3 text-ink/85')}>
          {block.items.map((item, i) => (
            <motion.li
              key={i}
              className="flex gap-3"
              initial={reduceMotion ? false : { opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: reduceMotion ? 0 : i * 0.08, duration: 0.35 }}
            >
              {block.ordered ? (
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tech/15 text-xs font-bold tabular-nums text-tech">
                  {i + 1}
                </span>
              ) : (
                <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-tech" aria-hidden />
              )}
              <span className="min-w-0">
                <Inline text={item} />
              </span>
            </motion.li>
          ))}
        </List>
      );
    }
    case 'takeaway':
      return (
        <figure className="relative my-10 overflow-hidden rounded-2xl border border-line border-tech/20 bg-gradient-to-br from-tech/10 via-tech/5 to-transparent px-6 py-6 sm:px-8">
          <motion.span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1 origin-top bg-gradient-to-b from-tech to-sky-400"
            initial={reduceMotion ? false : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          />
          <Quote className="absolute -right-2 -top-2 h-20 w-20 rotate-180 text-tech/10" aria-hidden />
          <figcaption className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-tech">
            <Sparkles className="h-3.5 w-3.5" />
            Takeaway
          </figcaption>
          <blockquote className={cn(s.takeaway, 'relative font-semibold leading-snug tracking-tight text-ink')}>
            <Inline text={block.text} />
          </blockquote>
        </figure>
      );
  }
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {proseSegments(text).map((seg, i) =>
        seg.mark === 'code' ? (
          <code key={i} className="rounded-md border border-line bg-mist px-1.5 py-0.5 font-mono text-[0.86em] text-ink">
            {seg.text}
          </code>
        ) : seg.mark === 'term' ? (
          <span
            key={i}
            className="rounded-sm bg-gradient-to-t from-tech/20 from-35% to-transparent to-35% px-0.5 font-semibold text-ink"
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
