import { lmsRepos } from '@/brico/lms';
import { normalizeCertificateCode, verifyCertificateCode } from '@/lib/certificate-verify';
import { isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/certificates/verify?code=411-XXXXXXXXXX — public: is this 411 Certificate
 * genuine, and is it valid, expired or revoked? Returns only what the certificate prints.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('code');
  const code = normalizeCertificateCode(raw);
  if (!code) return Response.json({ error: 'Enter a certificate number like 411-1A2B3C4D5E.' }, { status: 400 });
  if (!isDatabaseConfigured()) return Response.json({ error: 'Database not configured.' }, { status: 503 });
  try {
    const certificate = await verifyCertificateCode(code, lmsRepos().certificates);
    if (!certificate) return Response.json({ code, status: 'unknown' }, { status: 404 });
    return Response.json({ certificate }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Certificate verification failed:', error);
    return Response.json({ error: 'Could not verify the certificate. Please try again.' }, { status: 500 });
  }
}
