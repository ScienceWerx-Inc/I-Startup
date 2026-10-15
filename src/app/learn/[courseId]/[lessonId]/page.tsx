import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ClipboardCheck, Info, TriangleAlert } from 'lucide-react';

import { lessonContentId, lms, lmsRepos } from '@/brico/lms';
import { sessionUserId } from '@/lib/account';
import { EXERCISE_PREFIX } from '@/lib/gap-course/shared';
import { getCourseView } from '@/lib/gap-course/view';
import { cn } from '@/lib/utils';
import { Checkpoint, CompleteLesson } from '@/modules/gap-course/lesson-actions';
import { Eyebrow } from '@/modules/istartup-score/components/chrome';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Lesson · iStartup Score' };

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const userId = await sessionUserId();
  if (!userId) redirect('/start');
  const { courseId, lessonId } = await params;

  const view = await getCourseView(userId, courseId);
  if (!view?.curriculum || view.job.status !== 'ready') notFound();
  // The brick decides access: enrolled, lesson in their pinned curriculum, unlocked.
  const access = await lms().canAccessLesson({ courseId, userId, lessonId });
  if (!access.allowed) notFound();

  const content = await lmsRepos().lessonContent.get(lessonContentId(lessonId));
  if (!content) notFound();

  const { curriculum, completed } = view;
  const order = curriculum.sections.flatMap((s, si) => s.lessons.map((l) => ({ lesson: l, section: s, si })));
  const index = order.findIndex((x) => x.lesson.id === lessonId);
  const { lesson, section, si } = order[index];
  const prev = order[index - 1];
  const next = order[index + 1];

  const paragraphs = (content.body ?? '').split(/\n\s*\n/).filter(Boolean);
  const exercise = paragraphs.find((p) => p.startsWith(EXERCISE_PREFIX));
  const prose = paragraphs.filter((p) => p !== exercise);

  return (
    <article className="mx-auto max-w-3xl">
      <Link href={`/learn/${courseId}`} className="text-sm text-mut hover:text-ink">
        ← {view.course?.title ?? 'Course'}
      </Link>

      <Eyebrow className="mt-6">
        Module {si + 1} · {section.title} · Lesson {index + 1} of {order.length}
      </Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-ink">{lesson.title}</h1>

      <div className="mt-8 space-y-5">
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

      {content.checkpoint ? (
        <div className="mt-6">
          <Checkpoint checkpoint={content.checkpoint} />
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        {prev ? (
          <Link href={`/learn/${courseId}/${prev.lesson.id}`} className="text-sm text-mut hover:text-ink">
            ← {prev.lesson.title}
          </Link>
        ) : (
          <span />
        )}
        <CompleteLesson
          courseId={courseId}
          lessonId={lessonId}
          done={completed.has(lessonId)}
          nextHref={next ? `/learn/${courseId}/${next.lesson.id}` : `/learn/${courseId}`}
        />
      </div>
    </article>
  );
}
