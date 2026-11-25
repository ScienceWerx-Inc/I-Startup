import type { Certificate } from '@/features/lms/domain';
import type { Repository } from '@/features/lms/host/contract';
import { certificateExpiry } from '@/lib/gap-course/shared';

/**
 * Public verification of 411 Certificates. Anyone holding a certificate number can check
 * it, so the answer carries only what the certificate itself prints: the learner's name,
 * the course title, the issue and expiry dates, and whether it still stands.
 */

export type CertificateStatus = 'valid' | 'expired' | 'revoked';

export interface CertificateVerification {
  code: string;
  learnerName: string;
  courseTitle: string;
  /** ISO timestamps. */
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  status: CertificateStatus;
}

/** `411-` and ten uppercase hex digits, as minted by `lms().newCode` (src/brico/lms.ts). */
const CODE = /^411-[0-9A-F]{10}$/;

/** A well-formed certificate number (trimmed, upper-cased), or null. */
export function normalizeCertificateCode(raw: string | null | undefined): string | null {
  const code = (raw ?? '').trim().toUpperCase();
  return CODE.test(code) ? code : null;
}

export function certificateVerification(certificate: Certificate, now = Date.now()): CertificateVerification {
  const expiry = certificateExpiry(certificate.issuedAt);
  const status: CertificateStatus = certificate.revokedAt ? 'revoked' : expiry.getTime() <= now ? 'expired' : 'valid';
  return {
    code: certificate.code,
    learnerName: certificate.learnerNameSnap,
    courseTitle: certificate.courseTitleSnap,
    issuedAt: new Date(certificate.issuedAt).toISOString(),
    expiresAt: expiry.toISOString(),
    revokedAt: certificate.revokedAt ? new Date(certificate.revokedAt).toISOString() : null,
    status,
  };
}

/**
 * Looks a certificate up by number: one read, keyed by code. Unlike the brick's own
 * `verifyCertificate` (which returns null for a revoked one), revoked certificates are
 * reported as such, so a verifier sees "revoked" rather than "unknown".
 */
export async function verifyCertificateCode(
  raw: string | null | undefined,
  certificates: Pick<Repository<Certificate>, 'get'>,
  now = Date.now(),
): Promise<CertificateVerification | null> {
  const code = normalizeCertificateCode(raw);
  if (!code) return null;
  const certificate = await certificates.get(code);
  if (!certificate || certificate.code !== code) return null;
  return certificateVerification(certificate, now);
}

/** The public page that verifies `code`, absolute when the site's origin is known. */
export function certificateVerifyUrl(code: string, origin?: string | null): string {
  return `${(origin ?? '').replace(/\/+$/, '')}/verify/${encodeURIComponent(code)}`;
}
