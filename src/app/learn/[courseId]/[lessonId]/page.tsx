import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { lessonContentId, lms, lmsRepos } from '@/brico/lms';
import { sessionUserId } from '@/lib/account';
import { getCourseView } from '@/lib/gap-course/view';
import { Checkpoint, CompleteLesson } from '@/modules/gap-course/lesson-actions';
import { LessonBody } from '@/modules/gap-course/lesson-body';
import { LessonReader } from '@/modules/lessons/lesson-reader';
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

  return (
    <article className="mx-auto max-w-3xl">
      <Link href={`/learn/${courseId}`} className="text-sm text-mut hover:text-ink">
        ← {view.course?.title ?? 'Course'}
      </Link>

      <Eyebrow className="mt-6">
        Module {si + 1} · {section.title} · Lesson {index + 1} of {order.length}
      </Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-ink">{lesson.title}</h1>

      {/* Read or Slides: the same lesson two ways; the choice is remembered in the browser. */}
      <LessonReader content={content} title={lesson.title} finishTargetId="lesson-complete" record={{ courseId, lessonId }}>
        <div className="mt-6">
          <LessonBody content={content} title={lesson.title} />
        </div>

        {content.checkpoint ? (
          <div className="mt-6">
            <Checkpoint checkpoint={content.checkpoint} record={{ courseId, lessonId }} />
          </div>
        ) : null}
      </LessonReader>

      <div id="lesson-complete" className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
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
