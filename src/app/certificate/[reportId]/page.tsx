import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { sessionUserId } from '@/lib/account';
import { getScoreCertificate } from '@/lib/score-certificate';
import { CertificateScroller, SCORE_CERTIFICATE_NAME, ScoreCertificate } from '@/modules/certificates/certificate';
import { PrintButton } from '@/modules/gap-course/lesson-actions';
import { SiteNav } from '@/modules/istartup-score/components/landing/intel/site-nav';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${SCORE_CERTIFICATE_NAME} · iStartup Score` };

/** The Readiness Certificate for one of the founder's assessments: their score, valid six months. */
export default async function ScoreCertificatePage({ params }: { params: Promise<{ reportId: string }> }) {
  const userId = await sessionUserId();
  if (!userId) redirect('/start');
  const { reportId } = await params;
  const certificate = await getScoreCertificate(reportId, userId);
  if (!certificate) notFound();

  return (
    <div className="min-h-screen bg-paper">
      <SiteNav variant="page" />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/learn" className="text-sm text-mut hover:text-ink">
            ← My courses
          </Link>
          <PrintButton />
        </div>
        <CertificateScroller>
          <ScoreCertificate {...certificate} />
        </CertificateScroller>
      </main>
    </div>
  );
}
