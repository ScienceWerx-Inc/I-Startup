import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Certificate } from '@/features/lms/domain';
import { gatherPeers, hasPeersToAsk, readCard, readCertificates } from '@/lib/connect/client';
import {
  buildSummaryCard,
  certificatesFor,
  summaryFor,
  weakestDimensions,
  type CourseSummary,
  type FounderDirectory,
} from '@/lib/connect/istartup';
import type { ConnectApp } from '@/lib/connect/types';
import type { ReportRow } from '@/lib/reports';
import { QUESTIONS } from '@/modules/istartup-score/assessment/bank';

const ORIGIN = 'https://istartupscore.com';
const NOW = Date.parse('2026-11-26T00:00:00Z');
const REPORT_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

/** A full assessment: Market answered 1, everything else 4 — so Market is the weakest. */
function report(overrides: Partial<ReportRow> = {}): ReportRow {
  const answers = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.category === 'market' ? 1 : 4]));
  return {
    id: REPORT_ID,
    user_id: 'u1',
    app_id: null,
    startup_name: 'Nile Freight',
    profile: {},
    company_info: null,
    answers,
    scores: [],
    final_score: 0,
    band: '',
    country: null,
    region: null,
    city: null,
    created_at: '2026-11-20T10:00:00.000Z',
    ...overrides,
  };
}

function cert(overrides: Partial<Certificate> & { code: string }): Certificate {
  return {
    id: overrides.code,
    courseId: 'course_1',
    userId: 'u1',
    learnerNameSnap: 'Dana Okonjo',
    courseTitleSnap: 'Closing the gaps',
    issuedAt: Date.parse('2026-10-16T09:30:00Z'),
    curriculumVersion: 1,
    createdAt: '2026-10-16T09:30:00Z',
    updatedAt: '2026-10-16T09:30:00Z',
    version: 1,
    ...overrides,
  };
}

function directory(opts: {
  verified?: boolean;
  report?: ReportRow | null;
  courses?: CourseSummary[];
  certificates?: Certificate[];
}): FounderDirectory & { lookups: string[] } {
  const lookups: string[] = [];
  return {
    lookups,
    async findByEmail(email) {
      lookups.push(email);
      if (email !== 'dana@example.com') return null;
      return { id: 'u1', email: 'dana@example.com', email_verified_at: opts.verified === false ? null : '2026-11-01T00:00:00Z' };
    },
    async latestReport() {
      return opts.report === undefined ? report() : opts.report;
    },
    async courses() {
      return opts.courses ?? [];
    },
    async courseCertificates() {
      return opts.certificates ?? [];
    },
  };
}

describe('iStartup as a Connect provider: summary', () => {
  it('summarises the latest report: score/500, band, weakest dimension, link', async () => {
    const res = await summaryFor('Dana@Example.com', directory({}), ORIGIN);
    expect(res.found).toBe(true);
    if (!res.found) return;
    expect(res.app).toBe('istartup');
    expect(res.card.title).toBe('iStartup readiness');
    expect(res.card.headline).toMatch(/^\d{1,3} \/ 500 · .+/);
    expect(res.card.lines).toContainEqual({ label: 'Weakest area', value: 'Market' });
    expect(res.card.lines).toContainEqual({ label: 'Startup', value: 'Nile Freight' });
    expect(res.card.url).toBe(`${ORIGIN}/interview`);
    expect(res.card.updatedAt).toBe('2026-11-20T10:00:00.000Z');
  });

  it('adds course progress and links to the courses page', async () => {
    const courses: CourseSummary[] = [
      { title: 'Closing the gaps', status: 'ready', percent: 40, certificateId: null, updatedAt: '2026-11-22T00:00:00.000Z' },
    ];
    const res = await summaryFor('dana@example.com', directory({ courses }), ORIGIN);
    if (!res.found) throw new Error('expected found');
    expect(res.card.lines).toContainEqual({ label: 'Course', value: 'Closing the gaps · 40% complete' });
    expect(res.card.url).toBe(`${ORIGIN}/learn`);
    expect(res.card.updatedAt).toBe('2026-11-22T00:00:00.000Z');
  });

  it('keeps lines within the spec limits', () => {
    const card = buildSummaryCard({
      report: report({ startup_name: 'x'.repeat(400) }),
      courses: [{ title: 'y'.repeat(300), status: 'ready', percent: 100, certificateId: 'c', updatedAt: '2026-11-22T00:00:00.000Z' }],
      origin: ORIGIN,
    });
    expect(card.lines.length).toBeLessThanOrEqual(5);
    for (const l of card.lines) expect(l.value.length).toBeLessThanOrEqual(120);
  });

  it('names every tied weakest dimension', () => {
    expect(weakestDimensions([{ label: 'A', percent: 20 }, { label: 'B', percent: 20 }, { label: 'C', percent: 50 }])).toEqual(['A', 'B']);
  });

  it('says so when the founder has not taken the assessment', async () => {
    const res = await summaryFor('dana@example.com', directory({ report: null }), ORIGIN);
    if (!res.found) throw new Error('expected found');
    expect(res.card.headline).toBe('Assessment not taken yet');
    expect(res.card.lines).toEqual([]);
  });

  it('answers found:false, with nothing else, for an unknown person', async () => {
    expect(await summaryFor('someone@example.com', directory({}), ORIGIN)).toEqual({ app: 'istartup', found: false });
  });

  it('answers found:false for an account whose email is not verified', async () => {
    expect(await summaryFor('dana@example.com', directory({ verified: false }), ORIGIN)).toEqual({ app: 'istartup', found: false });
    expect(await certificatesFor('dana@example.com', directory({ verified: false }), ORIGIN)).toEqual({ app: 'istartup', found: false });
  });

  it('looks up only the subject, lower-cased', async () => {
    const dir = directory({});
    await summaryFor('  DANA@example.com ', dir, ORIGIN);
    expect(dir.lookups).toEqual(['dana@example.com']);
  });
});

describe('iStartup as a Connect provider: certificates', () => {
  it('lists the Readiness Certificate and course certificates with their status', async () => {
    const res = await certificatesFor(
      'dana@example.com',
      directory({
        certificates: [
          cert({ code: '411-0A1B2C3D4E' }),
          cert({ code: '411-1111111111', issuedAt: Date.parse('2026-01-10T00:00:00Z') }),
          cert({ code: '411-2222222222', revokedAt: Date.parse('2026-11-01T00:00:00Z') }),
        ],
      }),
      ORIGIN,
      NOW,
    );
    if (!res.found) throw new Error('expected found');
    const byCode = Object.fromEntries(res.certificates.map((c) => [c.code, c]));
    expect(res.certificates[0].code).toBe('IS-0A1B2C3D4E');
    expect(byCode['IS-0A1B2C3D4E']).toMatchObject({
      issuer: 'iStartup Score',
      status: 'VALID',
      issuedAt: '2026-11-20T10:00:00.000Z',
      verifyUrl: `${ORIGIN}/certificate/${REPORT_ID}`,
    });
    expect(byCode['IS-0A1B2C3D4E'].title).toMatch(/^iSTARTUP Readiness Certificate · Nile Freight \(\d+\/500\)$/);
    expect(byCode['411-0A1B2C3D4E']).toEqual({
      code: '411-0A1B2C3D4E',
      title: 'Closing the gaps',
      issuer: 'iStartup Score',
      issuedAt: '2026-10-16T09:30:00.000Z',
      expiresAt: '2027-04-16T09:30:00.000Z',
      status: 'VALID',
      verifyUrl: `${ORIGIN}/verify/411-0A1B2C3D4E`,
    });
    expect(byCode['411-1111111111'].status).toBe('EXPIRED');
    expect(byCode['411-2222222222'].status).toBe('REVOKED');
  });

  it('marks an old Readiness Certificate expired, and returns an empty list for a founder with nothing', async () => {
    const old = await certificatesFor('dana@example.com', directory({ report: report({ created_at: '2026-01-01T00:00:00.000Z' }) }), ORIGIN, NOW);
    if (!old.found) throw new Error('expected found');
    expect(old.certificates[0].status).toBe('EXPIRED');
    expect(await certificatesFor('dana@example.com', directory({ report: null }), ORIGIN, NOW)).toEqual({
      app: 'istartup',
      found: true,
      certificates: [],
    });
  });
});

/* ─────────────────────────────── consumer ─────────────────────────────── */

const KEY = `swc_${'A'.repeat(43)}`;
const peers = new Map<ConnectApp, string>([
  ['founderfit', 'https://ff.example'],
  ['prismscore', 'https://prism.example'],
  ['inkeep', 'https://inkeep.example'], // configured, but iStartup doesn't show it
]);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const ffSummary = {
  app: 'founderfit',
  found: true,
  card: {
    title: 'FounderFit profile',
    headline: 'Builder · 78 / 100',
    lines: [{ label: 'Top trait', value: 'Resilience' }],
    url: 'https://ff.example/report',
    updatedAt: '2026-11-21T00:00:00.000Z',
  },
};
const prismCerts = {
  app: 'prismscore',
  found: true,
  certificates: [
    {
      code: 'PS-1A2B3C4D5E',
      title: 'Nile Freight AI Action Plan',
      issuer: 'Prism School',
      issuedAt: '2026-11-01T00:00:00.000Z',
      expiresAt: '2027-11-01T00:00:00.000Z',
      status: 'VALID',
      verifyUrl: 'https://www.prismscore.us/verify/PS-1A2B3C4D5E',
    },
  ],
};

afterEach(() => vi.restoreAllMocks());

describe('iStartup as a Connect consumer', () => {
  it('asks FounderFit for a summary and Prism School for certificates, with the key and subject', async () => {
    const calls: Array<{ url: string; auth: string | null; subject: string | null }> = [];
    const fetchStub = async (url: string, init: RequestInit) => {
      const h = new Headers(init.headers);
      calls.push({ url, auth: h.get('authorization'), subject: h.get('x-connect-subject') });
      return url.startsWith('https://ff.example') ? json(ffSummary) : json(prismCerts);
    };
    const result = await gatherPeers({ subject: 'Dana@Example.com', key: KEY, peers, fetch: fetchStub, log: () => {} });
    expect(calls.map((c) => c.url).sort()).toEqual([
      'https://ff.example/api/connect/v1/summary',
      'https://prism.example/api/connect/v1/certificates',
    ]);
    for (const c of calls) {
      expect(c.auth).toBe(`Bearer ${KEY}`);
      expect(c.subject).toBe('dana@example.com');
    }
    expect(result.cards).toEqual([{ ...ffSummary.card, app: 'founderfit', appName: 'FounderFit' }]);
    expect(result.certificates).toEqual([{ ...prismCerts.certificates[0], app: 'prismscore' }]);
  });

  it('runs the calls in parallel', async () => {
    let inFlight = 0;
    let peak = 0;
    const fetchStub = async (url: string) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight--;
      return url.includes('ff.') ? json(ffSummary) : json(prismCerts);
    };
    await gatherPeers({ subject: 'dana@example.com', key: KEY, peers, fetch: fetchStub, log: () => {} });
    expect(peak).toBe(2);
  });

  it('fails soft: a peer that errors, refuses, times out or talks nonsense is just missing', async () => {
    const scenarios: Array<(url: string, init: RequestInit) => Promise<Response>> = [
      async () => {
        throw new TypeError('fetch failed');
      },
      async () => json({ error: 'unauthorized' }, 401),
      async () => json({ error: 'unavailable' }, 500),
      async () => new Response('<html>oops</html>', { status: 200 }),
      async () => json({ found: true, card: { title: 'x' } }),
      async () => json({ found: false }),
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    ];
    for (const broken of scenarios) {
      const fetchStub = (url: string, init: RequestInit) => (url.includes('ff.') ? broken(url, init) : Promise.resolve(json(prismCerts)));
      const result = await gatherPeers({ subject: 'dana@example.com', key: KEY, peers, fetch: fetchStub, timeoutMs: 30, log: () => {} });
      expect(result.cards).toEqual([]);
      expect(result.certificates).toHaveLength(1);
    }
  });

  it('asks nobody without a key or configured peers', async () => {
    const fetchStub = vi.fn();
    expect(await gatherPeers({ subject: 'dana@example.com', key: null, peers, fetch: fetchStub })).toEqual({ cards: [], certificates: [] });
    expect(await gatherPeers({ subject: 'dana@example.com', key: KEY, peers: new Map(), fetch: fetchStub })).toEqual({ cards: [], certificates: [] });
    expect(fetchStub).not.toHaveBeenCalled();
    expect(hasPeersToAsk(KEY, new Map([['inkeep', 'https://inkeep.example']]))).toBe(false);
    expect(hasPeersToAsk(KEY, peers)).toBe(true);
    expect(hasPeersToAsk(null, peers)).toBe(false);
  });

  it('logs a subject hash, never the email', async () => {
    const lines: string[] = [];
    await gatherPeers({ subject: 'dana@example.com', key: KEY, peers, fetch: async () => json(ffSummary), log: (l) => lines.push(l) });
    expect(lines).toHaveLength(2);
    expect(lines.join('\n')).not.toContain('dana');
  });

  it('sanitises peer answers: clipped lines, at most five, only http(s) links, known statuses', () => {
    const card = readCard({
      found: true,
      card: {
        title: 'T',
        headline: 'H',
        url: 'javascript:alert(1)',
        lines: [],
      },
    });
    expect(card).toBeNull();
    const ok = readCard({
      found: true,
      card: {
        title: 'T',
        headline: 'H',
        url: 'https://ff.example/x',
        lines: Array.from({ length: 8 }, (_, i) => ({ label: `L${i}`, value: 'v'.repeat(500) })),
      },
    });
    expect(ok?.lines).toHaveLength(5);
    expect(ok?.lines[0].value).toHaveLength(120);
    const certs = readCertificates({
      found: true,
      certificates: [
        { ...prismCerts.certificates[0], status: 'MAYBE' },
        { ...prismCerts.certificates[0], verifyUrl: 'data:text/html,hi' },
        prismCerts.certificates[0],
      ],
    });
    expect(certs).toHaveLength(1);
  });
});
