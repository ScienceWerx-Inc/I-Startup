import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Award } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sessionUserId } from '@/lib/account';
import { CERTIFICATE_NAME, CERTIFICATE_VALID_MONTHS, certificateExpiry, isCertificateExpired } from '@/lib/gap-course/shared';
import { getCourseView } from '@/lib/gap-course/view';
import { PrintButton } from '@/modules/gap-course/lesson-actions';
import { Wordmark } from '@/modules/istartup-score/components/chrome';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${CERTIFICATE_NAME} · iStartup Score` };

/**
 * The 411 Certificate, issued by the lms brick when the last lesson is completed. Valid for
 * six months from issue; the expiry is derived from the issue date, never stored.
 */
export default async function CertificatePage({ params }: { params: Promise<{ courseId: string }> }) {
  const userId = await sessionUserId();
  if (!userId) redirect('/start');
  const { courseId } = await params;
  const view = await getCourseView(userId, courseId);
  if (!view) notFound();

  const { certificate, job } = view;
  if (!certificate) {
    return (
      <div className="mx-auto max-w-xl rounded-card bg-surface p-8 text-center">
        <p className="text-lg font-semibold text-ink">Not certified yet</p>
        <p className="mt-1 text-sm text-mut">Complete every lesson of the course to earn the {CERTIFICATE_NAME}.</p>
        <Link href={`/learn/${courseId}`} className={buttonVariants({ className: 'mt-5' })}>
          Back to the course
        </Link>
      </div>
    );
  }

  const fmt = (d: Date) => d.toLocaleDateString(undefined, { dateStyle: 'long' });
  const issued = fmt(new Date(certificate.issuedAt));
  const expires = fmt(certificateExpiry(certificate.issuedAt));
  const expired = isCertificateExpired(certificate.issuedAt);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={`/learn/${courseId}`} className="text-sm text-mut hover:text-ink">
          ← Back to the course
        </Link>
        <PrintButton />
      </div>

      <div className="print-exact relative overflow-hidden rounded-card border-2 border-brand/30 bg-surface px-8 py-12 text-center sm:px-16">
        <Wordmark className="mx-auto" />
        <p className="mt-10 font-mono text-xs uppercase tracking-[0.25em] text-mut">Certificate of completion</p>
        <div className="relative mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-full border-2 border-brand-bright/70 bg-[radial-gradient(circle_at_30%_30%,#123456,#0b1b2b)] text-white">
          <span className="absolute inset-2 rounded-full border border-dashed border-white/30" aria-hidden />
          <span className="font-mono text-3xl font-semibold tracking-tight">411</span>
          <Award className="absolute -bottom-2 h-7 w-7 rounded-full bg-brand-bright p-1 text-white" aria-hidden />
        </div>
        <p className="mt-8 text-sm text-mut">This certifies that</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{certificate.learnerNameSnap}</p>
        <p className="mt-4 text-sm text-mut">has completed</p>
        <p className="mx-auto mt-2 max-w-xl text-xl font-medium text-ink">{certificate.courseTitleSnap}</p>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-mut">
          a gap-closing course built from the iSTARTUP readiness assessment of {job.plan.startup.name || 'their startup'},
          covering {job.plan.modules.map((m) => m.title).join(', ')}.
        </p>
        <p className="mt-10 text-lg font-semibold text-ink">{CERTIFICATE_NAME}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-2 text-xs text-mut">
          <span>Issued {issued}</span>
          <span className={expired ? 'font-semibold text-risk' : undefined}>
            {expired ? 'Expired' : 'Valid until'} {expires}
          </span>
          <span className="font-mono">Certificate {certificate.code}</span>
        </div>
        <p
          className={cn(
            'mx-auto mt-8 max-w-lg rounded-lg px-4 py-3 text-xs leading-relaxed',
            expired ? 'bg-risk-soft text-ink' : 'bg-mist text-mut',
          )}
        >
          {expired
            ? `This certificate expired on ${expires}. `
            : `Notice: this certificate expires ${CERTIFICATE_VALID_MONTHS} months after it was issued, on ${expires}. `}
          To renew it, retake the iSTARTUP assessment and complete the new course built from your results.
        </p>
      </div>
    </div>
  );
}
