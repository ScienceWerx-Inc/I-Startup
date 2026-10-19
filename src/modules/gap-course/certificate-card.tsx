import { Award } from 'lucide-react';

import { CERTIFICATE_NAME, CERTIFICATE_VALID_MONTHS, certificateExpiry, isCertificateExpired } from '@/lib/gap-course/shared';
import { cn } from '@/lib/utils';
import { Wordmark } from '@/modules/istartup-score/components/chrome';

/**
 * The 411 Certificate itself. Shared by the founder's certificate page and the admin
 * console, so an admin sees exactly the certificate the founder holds.
 */
export function CertificateCard({
  learnerName,
  courseTitle,
  startupName,
  modules,
  code,
  issuedAt,
  revokedAt,
}: {
  learnerName: string;
  courseTitle: string;
  startupName: string;
  modules: string[];
  code: string;
  issuedAt: number;
  revokedAt?: number | null;
}) {
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { dateStyle: 'long' });
  const issued = fmt(new Date(issuedAt));
  const expires = fmt(certificateExpiry(issuedAt));
  const expired = isCertificateExpired(issuedAt);

  return (
    <div className="print-exact relative overflow-hidden rounded-card border-2 border-brand/30 bg-surface px-8 py-12 text-center sm:px-16">
      <Wordmark className="mx-auto" />
      <p className="mt-10 font-mono text-xs uppercase tracking-[0.25em] text-mut">Certificate of completion</p>
      <div className="relative mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-full border-2 border-brand-bright/70 bg-[radial-gradient(circle_at_30%_30%,#123456,#0b1b2b)] text-white">
        <span className="absolute inset-2 rounded-full border border-dashed border-white/30" aria-hidden />
        <span className="font-mono text-3xl font-semibold tracking-tight">411</span>
        <Award className="absolute -bottom-2 h-7 w-7 rounded-full bg-brand-bright p-1 text-white" aria-hidden />
      </div>
      <p className="mt-8 text-sm text-mut">This certifies that</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{learnerName}</p>
      <p className="mt-4 text-sm text-mut">has completed</p>
      <p className="mx-auto mt-2 max-w-xl text-xl font-medium text-ink">{courseTitle}</p>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-mut">
        a gap-closing course built from the iSTARTUP readiness assessment of {startupName || 'their startup'}, covering{' '}
        {modules.join(', ')}.
      </p>
      <p className="mt-10 text-lg font-semibold text-ink">{CERTIFICATE_NAME}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-2 text-xs text-mut">
        <span>Issued {issued}</span>
        <span className={expired ? 'font-semibold text-risk' : undefined}>
          {expired ? 'Expired' : 'Valid until'} {expires}
        </span>
        <span className="font-mono">Certificate {code}</span>
      </div>
      {revokedAt ? (
        <p className="mx-auto mt-8 max-w-lg rounded-lg bg-risk-soft px-4 py-3 text-xs font-semibold text-risk">
          Revoked on {fmt(new Date(revokedAt))}.
        </p>
      ) : (
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
      )}
    </div>
  );
}
