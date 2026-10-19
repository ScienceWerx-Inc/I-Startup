import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, Award, Check, Circle, Clock } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { sessionUserId } from '@/lib/account';
import { CERTIFICATE_NAME, CERTIFICATE_VALID_MONTHS, certificateExpiry, isCertificateExpired } from '@/lib/gap-course/shared';
import { getCourseView } from '@/lib/gap-course/view';
import { cn } from '@/lib/utils';
import { CourseBuilder } from '@/modules/gap-course/course-builder';
import { Eyebrow, Panel } from '@/modules/istartup-score/components/chrome';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Course · iStartup Score' };

const minutes = (sec: number) => `${Math.max(1, Math.round(sec / 60))} min`;

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const userId = await sessionUserId();
  if (!userId) redirect('/start');
  const { courseId } = await params;
  const view = await getCourseView(userId, courseId);
  if (!view) notFound();

  const { job, course, curriculum, progress, completed, certificate } = view;

  // Still being generated (or interrupted): resume building right here.
  if (job.status !== 'ready' || !course || !curriculum) {
    return (
      <>
        <BackLink />
        <div className="mt-4">
          <CourseBuilder reportId={job.id} />
        </div>
      </>
    );
  }

  const lessons = curriculum.sections.flatMap((s) => s.lessons);
  const next = lessons.find((l) => !completed.has(l.id));
  const percent = progress?.percent ?? 0;

  return (
    <>
      <BackLink />
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Panel>
            <Eyebrow>Gap-closing course · {job.plan.startup.name || 'your startup'}</Eyebrow>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{course.title}</h1>
            {course.subtitle ? <p className="mt-2 text-[15px] text-mut">{course.subtitle}</p> : null}
            {course.description ? <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink">{course.description}</p> : null}

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-mut">
                  {completed.size} of {lessons.length} lessons · {minutes(curriculum.totalDurationSec)}
                </span>
                <span className="font-mono font-semibold text-ink">{percent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>

            {next ? (
              <Link href={`/learn/${courseId}/${next.id}`} className={buttonVariants({ size: 'lg', className: 'mt-6' })}>
                {completed.size === 0 ? 'Start the first lesson' : 'Continue'} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </Panel>

          {curriculum.sections.map((section, i) => {
            const planModule = job.plan.modules[i];
            return (
              <Panel key={section.id} className="p-0 sm:p-0">
                <div className="border-b border-line px-6 py-5 sm:px-8">
                  <p className="text-xs font-medium uppercase tracking-wide text-mut">
                    Module {i + 1}
                    {planModule ? ` · ${planModule.title} · you scored ${planModule.percent}%` : ''}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-ink">{section.title}</h2>
                </div>
                <ol>
                  {section.lessons.map((lesson) => {
                    const done = completed.has(lesson.id);
                    return (
                      <li key={lesson.id} className="border-b border-line last:border-0">
                        <Link
                          href={`/learn/${courseId}/${lesson.id}`}
                          className="flex items-center gap-3 px-6 py-4 transition-colors hover:bg-mist/60 sm:px-8"
                        >
                          {done ? (
                            <Check className="h-4 w-4 shrink-0 text-good" />
                          ) : (
                            <Circle className={cn('h-4 w-4 shrink-0', lesson.id === next?.id ? 'text-brand' : 'text-line-strong')} />
                          )}
                          <span className={cn('flex-1 text-[15px]', done ? 'text-mut' : 'text-ink')}>{lesson.title}</span>
                          <span className="flex shrink-0 items-center gap-1 text-xs text-mut">
                            <Clock className="h-3.5 w-3.5" /> {minutes(lesson.durationSec)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </Panel>
            );
          })}
        </div>

        <aside className="space-y-6">
          <Panel className="print-exact bg-readout text-center text-readout-ink">
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-brand-bright/70 bg-[radial-gradient(circle_at_30%_30%,#123456,#0b1b2b)]">
              <span className="absolute inset-2 rounded-full border border-dashed border-readout-line" aria-hidden />
              <span className="font-mono text-2xl font-semibold tracking-tight">411</span>
              <Award className="absolute -bottom-2 h-6 w-6 rounded-full bg-brand-bright p-1 text-white" aria-hidden />
            </div>
            <p className="mt-4 text-sm font-semibold">{CERTIFICATE_NAME}</p>
            {certificate ? (
              <>
                <p className="mt-1 text-[13px] text-readout-ink/70">Earned. Certificate {certificate.code}</p>
                <p className="mt-1 text-[13px] text-readout-ink/70">
                  {isCertificateExpired(certificate.issuedAt) ? 'Expired' : 'Valid until'}{' '}
                  {certificateExpiry(certificate.issuedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
                <Link
                  href={`/learn/${courseId}/certificate`}
                  className={buttonVariants({ size: 'sm', className: 'mt-4' })}
                >
                  View certificate
                </Link>
              </>
            ) : (
              <p className="mt-1 text-[13px] leading-relaxed text-readout-ink/70">
                Complete all {lessons.length} lessons to be certified. Valid for {CERTIFICATE_VALID_MONTHS} months.
              </p>
            )}
          </Panel>

          <Panel>
            <p className="text-sm font-semibold text-ink">Why this course</p>
            <p className="mt-1 text-xs text-mut">
              Built from your assessment: {job.plan.finalScore}/500 ({job.plan.band}).
            </p>
            <ul className="mt-4 space-y-3">
              {job.plan.modules.map((m) => (
                <li key={m.key}>
                  <p className="flex items-center justify-between text-sm font-medium text-ink">
                    {m.title} <span className="font-mono text-xs text-risk">{m.percent}%</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-mut">{m.focus.map((f) => f.title).join(' · ')}</p>
                </li>
              ))}
            </ul>
            <Link href={`/certificate/${job.id}`} className="mt-5 flex items-center gap-1 text-sm font-medium text-brand">
              Readiness Certificate ({job.plan.finalScore}/500) <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/interview" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand">
              Retake the assessment <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link href="/learn" className="text-sm text-mut hover:text-ink">
      ← My courses
    </Link>
  );
}
