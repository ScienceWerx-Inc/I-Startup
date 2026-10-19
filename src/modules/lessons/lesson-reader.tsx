'use client';

import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BookText, Presentation } from 'lucide-react';

import type { LessonContent } from '@/features/lms/domain';
import { EXERCISE_PREFIX } from '@/lib/gap-course/shared';
import { cn } from '@/lib/utils';

import { LessonSlides } from './lesson-slides';

/**
 * Read or Slides: the same lesson, two ways in.
 *
 * `children` is the reading view exactly as the page renders it today (prose,
 * diagram, callout, key points, self-check). Slides replace it with an
 * interactive deck of the same material. The choice is the learner's and is
 * remembered in this browser — someone who prefers slides wants them on the
 * next lesson too. Completion below is shared by both views. Ported from
 * ScienceWerx (src/components/learn/lesson-reader.tsx).
 */

type View = 'read' | 'slides';
const STORAGE_KEY = 'lesson-view';

interface Props {
  content: Pick<LessonContent, 'body' | 'keyPoints' | 'callout' | 'diagram' | 'checkpoint' | 'deck'>;
  title: string;
  finishTargetId?: string;
  children: ReactNode;
  /** Saves the founder's first checkpoint answer from the slides too. */
  record?: { courseId: string; lessonId: string };
}

/** The remembered view, read from storage like an external store (no effect, no flash). */
const VIEW_EVENT = 'lesson-view-change';
let sessionView: View = 'read';
function readView(): View {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'read' || saved === 'slides') return saved;
  } catch {
    /* storage blocked: this session's choice */
  }
  return sessionView;
}
function rememberView(next: View) {
  sessionView = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* the choice just won't be remembered across visits */
  }
  window.dispatchEvent(new Event(VIEW_EVENT));
}
function subscribeView(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(VIEW_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(VIEW_EVENT, onChange);
  };
}

export function LessonReader({ content, title, finishTargetId, children, record }: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const view = useSyncExternalStore(subscribeView, readView, () => 'read' as View);
  const choose = rememberView;

  // Nothing to put on slides: a lesson with no prose shows the reading view alone.
  if (!content.body?.trim()) return <>{children}</>;

  return (
    <div className="mt-6">
      <div
        role="tablist"
        aria-label="How to view this lesson"
        className="relative inline-flex rounded-xl border border-line bg-mist/40 p-1"
      >
        {(
          [
            ['read', 'Read', BookText],
            ['slides', 'Slides', Presentation],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => choose(value)}
            className={cn(
              'relative z-10 inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
              view === value ? 'text-white' : 'text-mut hover:text-ink',
            )}
          >
            {view === value && (
              <motion.span
                layoutId="lesson-view-pill"
                className="absolute inset-0 -z-10 rounded-lg bg-tech shadow-sm"
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {view === 'slides' ? (
        <LessonSlides content={slideContent(content)} exercise={exerciseOf(content.body)} title={title} finishTargetId={finishTargetId} record={record} />
      ) : (
        children
      )}
    </div>
  );
}

/** The body's closing "Your exercise: …" paragraph, shown on its own slide. */
function exerciseOf(body?: string): string | undefined {
  const p = (body ?? '').split(/\n\s*\n/).find((x) => x.startsWith(EXERCISE_PREFIX));
  return p ? p.slice(EXERCISE_PREFIX.length) : undefined;
}

/** The content with the exercise paragraph taken out of the prose the deck splits into slides. */
function slideContent<T extends { body?: string }>(content: T): T {
  const body = (content.body ?? '')
    .split(/\n\s*\n/)
    .filter((x) => !x.startsWith(EXERCISE_PREFIX))
    .join('\n\n');
  return { ...content, body };
}
