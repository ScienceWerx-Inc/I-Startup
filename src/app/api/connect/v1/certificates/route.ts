import { publicOrigin } from '@/lib/connect/env';
import { certificatesFor } from '@/lib/connect/istartup';
import { firestoreDirectory } from '@/lib/connect/istartup-data';
import { handleConnectRequest } from '@/lib/connect/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/connect/v1/certificates — ScienceWerx Connect: one founder's 411 course
 * certificates and latest Readiness Certificate, for a peer app holding the
 * `certificates` scope. Unknown or unverified → `{ found: false }`.
 */
export function GET(request: Request) {
  return handleConnectRequest(request, 'certificates', (subject) =>
    certificatesFor(subject, firestoreDirectory, publicOrigin()),
  );
}
