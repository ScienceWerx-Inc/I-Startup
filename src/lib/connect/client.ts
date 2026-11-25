import { subjectHash } from './auth';
import {
  CONNECT_APPS,
  MAX_LINE_VALUE,
  MAX_LINES,
  type CertificateStatus,
  type ConnectApp,
  type ConnectCard,
  type ConnectCertificate,
  type ConnectScope,
  type PeerCard,
  type PeerCertificate,
  type PeersResponse,
} from './types';

/**
 * Calling peers. Fail soft: a peer that is down, slow, unconfigured, refusing or answering
 * nonsense yields nothing, and its card is simply missing. Peer answers are untrusted:
 * every field is re-checked and clipped before it reaches the browser.
 */

export const PEER_TIMEOUT_MS = 4_000;

/** Which peers iStartup shows (ScienceWerx Connect v1, "Who shows what"). */
export const ISTARTUP_PLAN: Record<ConnectScope, readonly ConnectApp[]> = {
  summary: ['founderfit'],
  certificates: ['prismscore'],
};

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface PeerCallOptions {
  base: string;
  scope: ConnectScope;
  key: string;
  subject: string;
  fetch?: FetchLike;
  timeoutMs?: number;
}

/** One GET to a peer; its JSON body, or null on any failure. */
export async function callPeer(opts: PeerCallOptions): Promise<unknown | null> {
  const doFetch = opts.fetch ?? fetch;
  try {
    const res = await doFetch(`${opts.base}/api/connect/v1/${opts.scope}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${opts.key}`,
        'X-Connect-Subject': opts.subject.trim().toLowerCase(),
        Accept: 'application/json',
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(opts.timeoutMs ?? PEER_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g, ' ').slice(0, max) : null;

const httpUrl = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
};

const isoDate = (v: unknown): string | null => {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

const asObject = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** A peer's summary answer as a card, or null when not found or malformed. */
export function readCard(body: unknown): ConnectCard | null {
  const o = asObject(body);
  if (!o || o.found !== true) return null;
  const c = asObject(o.card);
  if (!c) return null;
  const title = str(c.title, 120);
  const headline = str(c.headline, 160);
  const url = httpUrl(c.url);
  if (!title || !headline || !url) return null;
  const lines = (Array.isArray(c.lines) ? c.lines : [])
    .map((l) => {
      const line = asObject(l);
      const label = line && str(line.label, 60);
      const value = line && str(line.value, MAX_LINE_VALUE);
      return label && value ? { label, value } : null;
    })
    .filter((l): l is { label: string; value: string } => l !== null)
    .slice(0, MAX_LINES);
  return { title, headline, lines, url, updatedAt: isoDate(c.updatedAt) ?? new Date(0).toISOString() };
}

const STATUSES: readonly CertificateStatus[] = ['VALID', 'EXPIRED', 'REVOKED'];

/** A peer's certificates answer, keeping only well-formed entries. */
export function readCertificates(body: unknown): ConnectCertificate[] {
  const o = asObject(body);
  if (!o || o.found !== true || !Array.isArray(o.certificates)) return [];
  return o.certificates
    .slice(0, 50)
    .map((raw): ConnectCertificate | null => {
      const c = asObject(raw);
      if (!c) return null;
      const code = str(c.code, 60);
      const title = str(c.title, 160);
      const issuer = str(c.issuer, 80);
      const issuedAt = isoDate(c.issuedAt);
      const verifyUrl = httpUrl(c.verifyUrl);
      const status = STATUSES.find((s) => s === c.status);
      if (!code || !title || !issuer || !issuedAt || !verifyUrl || !status) return null;
      return { code, title, issuer, issuedAt, expiresAt: isoDate(c.expiresAt), status, verifyUrl };
    })
    .filter((c): c is ConnectCertificate => c !== null);
}

export interface GatherOptions {
  subject: string;
  key: string | null;
  peers: ReadonlyMap<ConnectApp, string>;
  plan?: Record<ConnectScope, readonly ConnectApp[]>;
  fetch?: FetchLike;
  timeoutMs?: number;
  log?: (line: string) => void;
}

/**
 * Asks every planned, configured peer about `subject` in parallel and merges the answers.
 * Never throws; peers that fail are left out.
 */
export async function gatherPeers(opts: GatherOptions): Promise<PeersResponse> {
  const plan = opts.plan ?? ISTARTUP_PLAN;
  const log = opts.log ?? ((line: string) => console.info(line));
  const key = opts.key;
  if (!key) return { cards: [], certificates: [] };

  const calls = (Object.keys(plan) as ConnectScope[]).flatMap((scope) =>
    plan[scope]
      .filter((app) => opts.peers.has(app))
      .map(async (app) => {
        const started = Date.now();
        const body = await callPeer({
          base: opts.peers.get(app)!,
          scope,
          key,
          subject: opts.subject,
          fetch: opts.fetch,
          timeoutMs: opts.timeoutMs,
        });
        log(
          `[connect] peer=${app} endpoint=${scope} subject=${subjectHash(opts.subject)} answered=${body !== null} ms=${Date.now() - started}`,
        );
        return { app, scope, body };
      }),
  );

  const cards: PeerCard[] = [];
  const certificates: PeerCertificate[] = [];
  for (const { app, scope, body } of await Promise.all(calls)) {
    if (scope === 'summary') {
      const card = readCard(body);
      if (card) cards.push({ ...card, app, appName: CONNECT_APPS[app] });
    } else {
      for (const c of readCertificates(body)) certificates.push({ ...c, app });
    }
  }
  return { cards, certificates };
}

/** True when this app has a key and at least one planned peer to ask. */
export function hasPeersToAsk(
  key: string | null,
  peers: ReadonlyMap<ConnectApp, string>,
  plan: Record<ConnectScope, readonly ConnectApp[]> = ISTARTUP_PLAN,
): boolean {
  return Boolean(key) && Object.values(plan).some((apps) => apps.some((a) => peers.has(a)));
}
