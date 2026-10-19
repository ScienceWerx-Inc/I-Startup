import { Cormorant_Garamond } from 'next/font/google';
import type { ReactNode } from 'react';

import { CERTIFICATE_VALID_MONTHS, certificateExpiry, isCertificateExpired } from '@/lib/gap-course/shared';
import { cn } from '@/lib/utils';
import { Wordmark } from '@/modules/istartup-score/components/chrome';

/**
 * iSTARTUP certificates: the Readiness Certificate issued with every assessment (it carries
 * the startup's score) and the 411 Certificate earned by completing the gap-closing course.
 *
 * One design for both: an A4-landscape sheet with a security-print border, a guilloché seal,
 * and the validity printed on the certificate itself. Every size is in container-query
 * units (`cqw`), so the sheet looks identical at any width and prints edge to edge. No
 * hooks: it renders in server pages and in the admin console alike.
 */

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], style: ['normal', 'italic'], display: 'swap' });

const NAVY = '#0b1730';
const GOLD = '#a8854a';

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/* ───────────────────────────── Ornament ───────────────────────────── */

/** A guilloché band: interleaved sine waves, the pattern used on banknotes and diplomas. */
function guillochePath(width: number, height: number, phase: number, waves: number): string {
  const steps = 240;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const y = height / 2 + (height / 2.4) * Math.sin((i / steps) * Math.PI * 2 * waves + phase);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

function GuillocheBand({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 24" preserveAspectRatio="none" className={className} aria-hidden>
      {[0, 0.8, 1.6, 2.4, 3.2, 4.0].map((phase) => (
        <path key={phase} d={guillochePath(1000, 24, phase, 38)} fill="none" stroke={GOLD} strokeWidth="0.6" opacity="0.55" />
      ))}
    </svg>
  );
}

/** The seal: a rosette of rotated ellipses inside two rings, with the issuer on the rim. */
function Seal({ id, children, caption }: { id: string; children: ReactNode; caption: string }) {
  const petals = Array.from({ length: 36 }, (_, i) => i * 5);
  const ring = `seal-ring-${id.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <div className="relative aspect-square w-[13cqw]">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="100" cy="100" r="97" fill={NAVY} />
        <circle cx="100" cy="100" r="92" fill="none" stroke={GOLD} strokeWidth="1.2" />
        <circle cx="100" cy="100" r="70" fill="none" stroke={GOLD} strokeWidth="0.8" />
        <g opacity="0.35">
          {petals.map((deg) => (
            <ellipse key={deg} cx="100" cy="100" rx="66" ry="22" fill="none" stroke={GOLD} strokeWidth="0.5" transform={`rotate(${deg} 100 100)`} />
          ))}
        </g>
        <circle cx="100" cy="100" r="50" fill={NAVY} stroke={GOLD} strokeWidth="1" />
        <defs>
          <path id={ring} d="M100,100 m-81,0 a81,81 0 1,1 162,0 a81,81 0 1,1 -162,0" />
        </defs>
        {/* Stretched to the ring's circumference (2π·81 ≈ 509) so the caption meets itself exactly. */}
        <text fill={GOLD} fontSize="10" fontFamily="ui-monospace, monospace">
          <textPath href={`#${ring}`} startOffset="0" textLength="506" lengthAdjust="spacing">
            {`${caption} • ${caption} • `}
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">{children}</div>
    </div>
  );
}

/* ───────────────────────────── Sheet ───────────────────────────── */

/**
 * The certificate sheet. `status` stamps EXPIRED or REVOKED across it. Wrap it in a
 * scroller on phones: below ~720px the type would be too small to read.
 */
function Sheet({
  kicker,
  title,
  children,
  seal,
  issuedAt,
  validUntil,
  code,
  notice,
  status,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  seal: ReactNode;
  issuedAt: number;
  validUntil: Date;
  code: string;
  notice: ReactNode;
  status: 'valid' | 'expired' | 'revoked';
}) {
  return (
    <div className="certificate-sheet print-exact @container relative aspect-[297/210] w-full overflow-hidden lining-nums bg-[#fdfcf8] text-[#0b1730] shadow-[0_1px_2px_rgba(11,23,48,0.08),0_12px_40px_-12px_rgba(11,23,48,0.25)]">
      {/* Frame: navy rule, guilloché band, fine gold rule. */}
      <div className="absolute inset-[1.6cqw] border-[0.35cqw] border-[#0b1730]" />
      <GuillocheBand className="absolute inset-x-[2.4cqw] top-[2.35cqw] h-[1.2cqw] w-[calc(100%-4.8cqw)]" />
      <GuillocheBand className="absolute inset-x-[2.4cqw] bottom-[2.35cqw] h-[1.2cqw] w-[calc(100%-4.8cqw)]" />
      <div className="absolute inset-[3.9cqw] border border-[#a8854a]/70" />
      <div className="absolute inset-[4.3cqw] border border-[#a8854a]/30" />
      {(['left-[3.4cqw] top-[3.4cqw]', 'right-[3.4cqw] top-[3.4cqw] rotate-90', 'right-[3.4cqw] bottom-[3.4cqw] rotate-180', 'left-[3.4cqw] bottom-[3.4cqw] -rotate-90'] as const).map(
        (pos) => (
          <svg key={pos} viewBox="0 0 40 40" className={cn('absolute h-[3.4cqw] w-[3.4cqw]', pos)} aria-hidden>
            <path d="M2 38 V2 H38" fill="none" stroke={GOLD} strokeWidth="2" />
            <path d="M8 38 V8 H38" fill="none" stroke={GOLD} strokeWidth="0.8" />
            <circle cx="8" cy="8" r="2.4" fill={GOLD} />
          </svg>
        ),
      )}
      {/* Watermark. */}
      <p
        className={cn(serif.className, 'pointer-events-none absolute inset-0 flex items-center justify-center text-[30cqw] font-semibold italic leading-none text-[#0b1730]/[0.025]')}
        aria-hidden
      >
        iS
      </p>

      <div className="absolute inset-[6cqw] flex flex-col items-center text-center">
        <Wordmark className="h-[2.3cqw] sm:h-[2.3cqw]" />
        <p className="mt-[1.6cqw] font-mono text-[0.95cqw] uppercase tracking-[0.42em] text-[#a8854a]">{kicker}</p>
        <h1 className={cn(serif.className, 'mt-[0.6cqw] text-[4.4cqw] font-semibold leading-none tracking-[0.01em]')}>{title}</h1>
        <div className="mt-[0.9cqw] flex items-center gap-[1cqw]" aria-hidden>
          <span className="h-px w-[8cqw] bg-[#a8854a]/70" />
          <span className="h-[0.55cqw] w-[0.55cqw] rotate-45 bg-[#a8854a]" />
          <span className="h-px w-[8cqw] bg-[#a8854a]/70" />
        </div>

        <div className="flex w-full flex-1 flex-col items-center justify-center">{children}</div>

        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-end gap-[3cqw]">
          <div className="text-center">
            <p className={cn(serif.className, 'text-[1.75cqw] font-semibold')}>{fmtDate(issuedAt)}</p>
            <div className="mx-auto mt-[0.4cqw] h-px w-[70%] bg-[#0b1730]/40" />
            <p className="mt-[0.5cqw] font-mono text-[0.85cqw] uppercase tracking-[0.25em] text-[#4a5568]">Date of issue</p>
          </div>
          <div className="-mb-[1cqw]">{seal}</div>
          <div className="text-center">
            <p className={cn(serif.className, 'text-[1.75cqw] font-semibold', status !== 'valid' && 'text-[#b42318]')}>
              {fmtDate(validUntil.getTime())}
            </p>
            <div className="mx-auto mt-[0.4cqw] h-px w-[70%] bg-[#0b1730]/40" />
            <p className="mt-[0.5cqw] font-mono text-[0.85cqw] uppercase tracking-[0.25em] text-[#4a5568]">
              {status === 'expired' ? 'Expired on' : 'Valid until'}
            </p>
          </div>
        </div>

        <p className="mt-[1.8cqw] max-w-[78%] text-[0.95cqw] leading-relaxed text-[#4a5568]">{notice}</p>
        <p className="mt-[0.5cqw] font-mono text-[0.85cqw] tracking-[0.18em] text-[#0b1730]">
          CERTIFICATE NO. {code} · ISSUED BY ISTARTUP SCORE
        </p>
      </div>

      {status !== 'valid' ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="-rotate-[18deg] rounded-[0.6cqw] border-[0.4cqw] border-[#b42318]/70 px-[2.5cqw] py-[0.6cqw] font-mono text-[5cqw] font-bold uppercase tracking-[0.2em] text-[#b42318]/70">
            {status}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Lets a certificate scroll sideways on a phone instead of shrinking past legibility. */
export function CertificateScroller({ children }: { children: ReactNode }) {
  return (
    <div className="certificate-scroller -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="min-w-[720px]">{children}</div>
    </div>
  );
}

/* ───────────────────────────── Readiness Certificate ───────────────────────────── */

export const SCORE_CERTIFICATE_NAME = 'iSTARTUP Readiness Certificate';

/** The readiness certificate's number, derived from its report: stable, never stored. */
export const scoreCertificateCode = (reportId: string) => `IS-${reportId.replace(/-/g, '').slice(0, 10).toUpperCase()}`;

/** Issued with every saved assessment; carries the startup's score and expires after six months. */
export function ScoreCertificate({
  reportId,
  startupName,
  founderName,
  score,
  maxScore,
  band,
  dimensions,
  issuedAt,
}: {
  reportId: string;
  startupName: string;
  founderName: string | null;
  score: number;
  maxScore: number;
  band: string;
  dimensions: Array<{ label: string; percent: number }>;
  issuedAt: number;
}) {
  const validUntil = certificateExpiry(issuedAt);
  const expired = isCertificateExpired(issuedAt);
  const code = scoreCertificateCode(reportId);

  return (
    <Sheet
      kicker="iSTARTUP Readiness Index"
      title="Certificate of Assessment"
      issuedAt={issuedAt}
      validUntil={validUntil}
      code={code}
      status={expired ? 'expired' : 'valid'}
      seal={
        <Seal id={code} caption="ISTARTUP SCORE · CERTIFIED">
          <span className={cn(serif.className, 'text-[3.1cqw] font-bold leading-none')}>{score}</span>
          <span className="mt-[0.25cqw] font-mono text-[0.75cqw] tracking-[0.2em] text-[#d9c08f]">/ {maxScore}</span>
        </Seal>
      }
      notice={
        <>
          This certificate is valid for {CERTIFICATE_VALID_MONTHS} months from its date of issue and{' '}
          <strong className="font-semibold text-[#0b1730]">
            {expired ? 'expired' : 'expires'} on {fmtDate(validUntil.getTime())}
          </strong>
          . The score reflects the startup&apos;s answers to the iSTARTUP assessment on the date of issue; retake the
          assessment to renew it.
        </>
      }
    >
      <p className={cn(serif.className, 'text-[1.7cqw] italic text-[#4a5568]')}>This certifies that</p>
      <p className={cn(serif.className, 'mt-[0.4cqw] text-[4.6cqw] font-semibold leading-tight')}>{startupName || 'Unnamed startup'}</p>
      {founderName ? <p className="mt-[0.2cqw] text-[1.25cqw] text-[#4a5568]">represented by {founderName}</p> : null}
      <p className="mx-auto mt-[1.1cqw] max-w-[62%] text-[1.35cqw] leading-relaxed">
        has completed the iSTARTUP investment-readiness assessment and achieved a score of{' '}
        <strong className="font-semibold">
          {score} out of {maxScore}
        </strong>
        , placing it in the <strong className="font-semibold">{band}</strong> band.
      </p>
      {dimensions.length ? (
        <div className="mt-[1.4cqw] flex divide-x divide-[#a8854a]/40 border-y border-[#a8854a]/40 py-[0.7cqw]">
          {dimensions.map((d) => (
            <div key={d.label} className="px-[1.5cqw] text-center">
              <p className={cn(serif.className, 'text-[1.9cqw] font-semibold leading-none')}>{d.percent}%</p>
              <p className="mt-[0.35cqw] font-mono text-[0.75cqw] uppercase tracking-[0.18em] text-[#4a5568]">{d.label}</p>
            </div>
          ))}
        </div>
      ) : null}
    </Sheet>
  );
}

/* ───────────────────────────── 411 Certificate ───────────────────────────── */

/** Earned by completing a gap-closing course; valid for six months. */
export function CourseCertificate({
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
  const validUntil = certificateExpiry(issuedAt);
  const expired = isCertificateExpired(issuedAt);
  const covering = modules.length > 1 ? `${modules.slice(0, -1).join(', ')} and ${modules[modules.length - 1]}` : modules[0];

  return (
    <Sheet
      kicker="iSTARTUP Score · 411 Program"
      title="Certificate of Completion"
      issuedAt={issuedAt}
      validUntil={validUntil}
      code={code}
      status={revokedAt ? 'revoked' : expired ? 'expired' : 'valid'}
      seal={
        <Seal id={code} caption="411 CERTIFICATE · ISTARTUP">
          <span className={cn(serif.className, 'text-[3.4cqw] font-bold leading-none')}>411</span>
          <span className="mt-[0.3cqw] font-mono text-[0.7cqw] tracking-[0.25em] text-[#d9c08f]">CERTIFIED</span>
        </Seal>
      }
      notice={
        revokedAt ? (
          <>This certificate was revoked on {fmtDate(revokedAt)} and is no longer valid.</>
        ) : (
          <>
            This certificate is valid for {CERTIFICATE_VALID_MONTHS} months from its date of issue and{' '}
            <strong className="font-semibold text-[#0b1730]">
              {expired ? 'expired' : 'expires'} on {fmtDate(validUntil.getTime())}
            </strong>
            . To renew it, retake the iSTARTUP assessment and complete the new course built from the results.
          </>
        )
      }
    >
      <p className={cn(serif.className, 'text-[1.7cqw] italic text-[#4a5568]')}>This certifies that</p>
      <p className={cn(serif.className, 'mt-[0.4cqw] text-[4.6cqw] font-semibold leading-tight')}>{learnerName}</p>
      <p className="mt-[0.9cqw] text-[1.35cqw]">has successfully completed</p>
      <p className={cn(serif.className, 'mt-[0.4cqw] max-w-[70%] text-[2.4cqw] font-semibold italic leading-tight')}>{courseTitle}</p>
      <p className="mx-auto mt-[1cqw] max-w-[60%] text-[1.2cqw] leading-relaxed text-[#4a5568]">
        a gap-closing programme built from the iSTARTUP readiness assessment of {startupName || 'their startup'}
        {covering ? `, covering ${covering}` : ''}.
      </p>
    </Sheet>
  );
}
