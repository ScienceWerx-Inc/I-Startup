import { currentUser } from '@/lib/account';
import { gatherPeers, hasPeersToAsk } from '@/lib/connect/client';
import { connectConfig } from '@/lib/connect/env';
import type { PeersResponse } from '@/lib/connect/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * GET /api/connect/peers — what other ScienceWerx apps know about the signed-in founder:
 * FounderFit's summary card and Prism School's certificates, asked server-side with the
 * founder's verified email. Peers that fail are left out; nothing about why reaches the
 * browser. An unverified founder gets `needsVerification` instead (when any peer is set up).
 */
export async function GET() {
  const user = await currentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401, headers: NO_STORE });

  const { key, peers } = connectConfig();
  const empty: PeersResponse = { cards: [], certificates: [] };
  if (!hasPeersToAsk(key, peers)) return Response.json(empty, { headers: NO_STORE });
  if (!user.email_verified_at) return Response.json({ ...empty, needsVerification: true }, { headers: NO_STORE });

  const result = await gatherPeers({ subject: user.email, key, peers });
  return Response.json(result, { headers: NO_STORE });
}
