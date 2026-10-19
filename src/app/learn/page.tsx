import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Check, GraduationCap, Loader2 } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { sessionUserId } from '@/lib/account';
import { listJobs } from '@/lib/gap-course/service';
import { listCourseCards } from '@/lib/gap-course/view';
import { Eyebrow, Panel } from '@/modules/istartup-score/components/chrome';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My Courses · iStartup Score' };

/** Every gap-closing course a founder has, one per assessment they finished. */
export default async function LearnPage() {
  const userId = await sessionUserId();
  if (!userId) redirect('/start');
  const cards = await listCourseCards(await listJobs(userId));

  return (
    <>
      <Eyebrow>My courses</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Close the gaps your score found</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-mut">
        Each assessment builds a course around your weakest dimensions. Finish every lesson to earn the 411
        Certificate, valid for 6 months, then retake the assessment to see your score move.
      </p>

      {cards.length === 0 ? (
        <Panel className="mt-8 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-brand" />
          <p className="mt-3 text-lg font-semibold text-ink">No courses yet</p>
          <p className="mt-1 text-sm text-mut">Finish your assessment and your course is built from the results.</p>
          <Link href="/interview" className={buttonVariants({ className: 'mt-5' })}>
            Go to my assessment <ArrowRight className="h-4 w-4" />
          </Link>
        </Panel>
      ) : (
        <ul className="mt-8 grid gap-4">
          {cards.map((c) => (
            <li key={c.courseId}>
              <Link href={`/learn/${c.courseId}`} className="block rounded-card bg-surface p-6 transition-shadow hover:shadow-md sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-mut">
                      {c.startup || 'Your startup'} · score {c.score}/500 ·{' '}
                      {new Date(c.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-ink">{c.title}</p>
                    {c.subtitle ? <p className="mt-0.5 text-sm text-mut">{c.subtitle}</p> : null}
                    <p className="mt-3 flex flex-wrap gap-1.5">
                      {c.modules.map((m) => (
                        <span key={m} className="rounded-full bg-mist px-2.5 py-1 text-xs text-ink">
                          {m}
                        </span>
                      ))}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {c.status === 'ready' ? (
                      <>
                        <p className="font-mono text-2xl font-semibold text-ink">{c.percent}%</p>
                        <p className="flex items-center justify-end gap-1 text-xs text-mut">
                          {c.percent === 100 ? <Check className="h-3.5 w-3.5 text-good" /> : null}
                          {c.percent === 100 ? 'Certified' : 'complete'}
                        </p>
                      </>
                    ) : (
                      <p className="flex items-center gap-1.5 text-sm text-mut">
                        <Loader2 className="h-4 w-4 text-brand" />
                        {c.lessonsTotal ? `${c.lessonsWritten}/${c.lessonsTotal} lessons written` : 'Being designed'}
                      </p>
                    )}
                  </div>
                </div>
                {c.status === 'ready' ? (
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-mist">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${c.percent}%` }} />
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
