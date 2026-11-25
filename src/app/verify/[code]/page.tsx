import type { Metadata } from 'next';
import { CheckCircle2, XCircle } from 'lucide-react';

import { lmsRepos } from '@/brico/lms';
import { normalizeCertificateCode, verifyCertificateCode, type CertificateStatus } from '@/lib/certificate-verify';
import { CERTIFICATE_NAME } from '@/lib/gap-course/shared';
import { LookupForm } from '../lookup-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `Verify a certificate · iStartup Score`, robots: { index: false } };

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const STATUS: Record<CertificateStatus, { label: string; good: boolean; text: string }> = {
  valid: { label: 'VALID', good: true, text: 'This certificate is genuine and currently valid.' },
  expired: { label: 'EXPIRED', good: false, text: 'This certificate is genuine but has expired.' },
  revoked: { label: 'REVOKED', good: false, text: 'This certificate was revoked and is no longer valid.' },
};

/** Public verification of one 411 Certificate, showing only what the certificate prints. */
export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeCertificateCode(decodeURIComponent(raw));
  const result = code ? await verifyCertificateCode(code, lmsRepos().certificates) : null;

  if (!result) {
    return (
      <div className="rounded-card bg-surface p-8">
        <p className="flex items-center gap-2 text-lg font-semibold text-risk">
          <XCircle className="h-5 w-5" /> No such certificate
        </p>
        <p className="mt-2 text-sm text-mut">
          No {CERTIFICATE_NAME} has the number <span className="font-mono text-ink">{code ?? raw}</span>. Check the number and try again.
        </p>
        <div className="mt-5">
          <LookupForm defaultValue={code ?? ''} />
        </div>
      </div>
    );
  }

  const status = STATUS[result.status];
  return (
    <div className="rounded-card bg-surface p-8">
      <p className={`flex items-center gap-2 font-mono text-lg font-bold tracking-[0.2em] ${status.good ? 'text-good' : 'text-risk'}`}>
        {status.good ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
        {status.label}
      </p>
      <p className="mt-1 text-sm text-mut">{status.text}</p>
      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-mut">Certificate</dt>
        <dd className="font-mono text-ink">
          {CERTIFICATE_NAME} · {result.code}
        </dd>
        <dt className="text-mut">Awarded to</dt>
        <dd className="font-semibold text-ink">{result.learnerName}</dd>
        <dt className="text-mut">Course</dt>
        <dd className="text-ink">{result.courseTitle}</dd>
        <dt className="text-mut">Date of issue</dt>
        <dd className="text-ink">{fmtDate(result.issuedAt)}</dd>
        <dt className="text-mut">{result.status === 'expired' ? 'Expired on' : 'Valid until'}</dt>
        <dd className="text-ink">{fmtDate(result.expiresAt)}</dd>
        {result.revokedAt ? (
          <>
            <dt className="text-mut">Revoked on</dt>
            <dd className="text-risk">{fmtDate(result.revokedAt)}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}
