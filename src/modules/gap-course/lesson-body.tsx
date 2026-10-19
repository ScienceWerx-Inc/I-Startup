import { ClipboardCheck, Info, TriangleAlert } from 'lucide-react';

import type { LessonContent } from '@/features/lms/domain';
import { EXERCISE_PREFIX } from '@/lib/gap-course/shared';
import { cn } from '@/lib/utils';

/**
 * A written lesson as the founder reads it: prose, callout, key points and the exercise.
 * Shared by the lesson page and the admin console's course review, so both show the same.
 */
export function LessonBody({ content }: { content: Pick<LessonContent, 'body' | 'keyPoints' | 'callout'> }) {
  const paragraphs = (content.body ?? '').split(/\n\s*\n/).filter(Boolean);
  const exercise = paragraphs.find((p) => p.startsWith(EXERCISE_PREFIX));
  const prose = paragraphs.filter((p) => p !== exercise);

  return (
    <>
      <div className="space-y-5">
        {prose.map((p, i) => (
          <p key={i} className={cn('leading-relaxed text-ink', i === 0 ? 'text-[18px]' : 'text-[16px]')}>
            {p}
          </p>
        ))}
      </div>

      {content.callout ? (
        <div
          className={cn(
            'mt-8 flex gap-3 rounded-lg p-4 text-[15px] leading-relaxed text-ink',
            content.callout.kind === 'warning' ? 'bg-warn-soft' : 'bg-brand-soft',
          )}
        >
          {content.callout.kind === 'warning' ? (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          )}
          <p>{content.callout.text}</p>
        </div>
      ) : null}

      {content.keyPoints?.length ? (
        <div className="mt-8 rounded-card bg-surface p-6 sm:p-8">
          <p className="eyebrow">Key points</p>
          <ul className="mt-3 space-y-2">
            {content.keyPoints.map((k) => (
              <li key={k} className="flex gap-2.5 text-[15px] leading-relaxed text-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {k}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {exercise ? (
        <div className="mt-6 rounded-card border border-fund/30 bg-fund-soft p-6 sm:p-8">
          <p className="eyebrow flex items-center gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" /> Apply it to your startup
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">{exercise.slice(EXERCISE_PREFIX.length)}</p>
        </div>
      ) : null}
    </>
  );
}
