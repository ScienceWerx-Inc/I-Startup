import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { sessionUserId } from '@/lib/account';
import { CERTIFICATE_NAME } from '@/lib/gap-course/shared';
import { getCourseView } from '@/lib/gap-course/view';
import { CertificateScroller, CourseCertificate } from '@/modules/certificates/certificate';
import { PrintButton } from '@/modules/gap-course/lesson-actions';

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
        <p className="mt-1 text-sm text-mut">Complete every lesson and pass each module quiz to earn the {CERTIFICATE_NAME}.</p>
        <Link href={`/learn/${courseId}`} className={buttonVariants({ className: 'mt-5' })}>
          Back to the course
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={`/learn/${courseId}`} className="text-sm text-mut hover:text-ink">
          ← Back to the course
        </Link>
        <PrintButton />
      </div>
      <CertificateScroller>
        <CourseCertificate
        learnerName={certificate.learnerNameSnap}
        courseTitle={certificate.courseTitleSnap}
        startupName={job.plan.startup.name}
        modules={job.plan.modules.map((m) => m.title)}
        code={certificate.code}
        issuedAt={certificate.issuedAt}
        revokedAt={certificate.revokedAt}
        />
      </CertificateScroller>
    </div>
  );
}
