import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { normalizeCertificateCode } from '@/lib/certificate-verify';
import { CERTIFICATE_NAME } from '@/lib/gap-course/shared';
import { LookupForm } from './lookup-form';

export const metadata: Metadata = { title: `Verify a certificate · iStartup Score` };

export default async function VerifyLookupPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const { code: raw } = await searchParams;
  const entered = Array.isArray(raw) ? raw[0] : raw;
  const code = normalizeCertificateCode(entered);
  if (code) redirect(`/verify/${code}`);

  return (
    <div className="rounded-card bg-surface p-8">
      <h1 className="text-2xl font-semibold text-ink">Verify a certificate</h1>
      <p className="mt-2 text-sm text-mut">
        Enter the number printed at the foot of a {CERTIFICATE_NAME} to check that it is genuine and still valid.
      </p>
      {entered ? (
        <p className="mt-4 text-sm text-risk">That is not a certificate number. They look like 411-1A2B3C4D5E.</p>
      ) : null}
      <div className="mt-5">
        <LookupForm defaultValue={entered ?? ''} />
      </div>
    </div>
  );
}
