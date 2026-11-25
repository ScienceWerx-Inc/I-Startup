import { publicOrigin } from '@/lib/connect/env';
import { summaryFor } from '@/lib/connect/istartup';
import { firestoreDirectory } from '@/lib/connect/istartup-data';
import { handleConnectRequest } from '@/lib/connect/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/connect/v1/summary — ScienceWerx Connect: a display-ready card about one
 * founder (the `X-Connect-Subject`, a verified email) for a peer app holding the
 * `summary` scope. Unknown or unverified → `{ found: false }`.
 */
export function GET(request: Request) {
  return handleConnectRequest(request, 'summary', (subject) => summaryFor(subject, firestoreDirectory, publicOrigin()));
}
