import { subjectHash, verifyCaller } from './auth';
import { connectConfig, type CallerEntry } from './env';
import type { ConnectScope } from './types';

/**
 * The shared shell of every `/api/connect/v1/*` endpoint: caller checks in spec order,
 * one lookup of the subject, a log line without the raw email, and `no-store` on every
 * answer.
 */

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function handleConnectRequest(
  request: Request,
  scope: ConnectScope,
  answer: (subject: string) => Promise<{ found: boolean }>,
  opts: { callers?: readonly CallerEntry[]; log?: (line: string) => void } = {},
): Promise<Response> {
  const log = opts.log ?? ((line: string) => console.info(line));
  const callers = opts.callers ?? connectConfig().callers;
  const check = verifyCaller(request.headers, scope, callers);
  if (!check.ok) {
    log(`[connect] caller=${check.caller ?? '-'} endpoint=${scope} subject=- found=- status=${check.status}`);
    return Response.json({ error: check.error }, { status: check.status, headers: NO_STORE });
  }
  const hash = subjectHash(check.subject);
  try {
    const body = await answer(check.subject);
    log(`[connect] caller=${check.caller} endpoint=${scope} subject=${hash} found=${body.found} status=200`);
    return Response.json(body, { headers: NO_STORE });
  } catch (error) {
    log(`[connect] caller=${check.caller} endpoint=${scope} subject=${hash} found=- status=500`);
    console.error('[connect] lookup failed:', error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error');
    return Response.json({ error: 'unavailable' }, { status: 500, headers: NO_STORE });
  }
}
