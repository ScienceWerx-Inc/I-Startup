import { createHash, randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { subjectHash, verifyCaller } from '@/lib/connect/auth';
import { connectConfig, parseCallers, parseConnectKey, parsePeers } from '@/lib/connect/env';
import { handleConnectRequest } from '@/lib/connect/provider';
import { config as proxyConfig } from '@/proxy';

const newKey = () => `swc_${randomBytes(32).toString('base64url')}`;
const hex = (key: string) => createHash('sha256').update(key).digest('hex');

const PRISM = newKey();
const FF = newKey();
const callers = parseCallers(`prismscore:${hex(PRISM)}:summary|certificates, founderfit:${hex(FF)}:summary`);

const headers = (h: Record<string, string>) => new Headers(h);

afterEach(() => vi.restoreAllMocks());

describe('Connect env parsing', () => {
  it('generates keys of the spec shape', () => {
    expect(PRISM).toMatch(/^swc_[A-Za-z0-9_-]{43}$/);
  });

  it('parses callers with their scopes', () => {
    expect(callers.map((c) => [c.name, [...c.scopes]])).toEqual([
      ['prismscore', ['summary', 'certificates']],
      ['founderfit', ['summary']],
    ]);
    expect(callers[0].hash.equals(createHash('sha256').update(PRISM).digest())).toBe(true);
  });

  it('skips malformed caller entries without printing anything secret', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const parsed = parseCallers(
      [
        `bad:${hex(PRISM).toUpperCase()}:summary`, // upper-case hex
        `short:abc123:summary`,
        `noscope:${hex(PRISM)}:`,
        `unknown:${hex(PRISM)}:summary|write`,
        `extra:${hex(PRISM)}:summary:more`,
        `Upper:${hex(PRISM)}:summary`,
        `ok:${hex(FF)}:certificates`,
      ].join(','),
    );
    expect(parsed.map((c) => c.name)).toEqual(['ok']);
    expect(warn).toHaveBeenCalledTimes(6);
    for (const [line] of warn.mock.calls) expect(String(line)).not.toContain(hex(PRISM));
  });

  it('treats an empty or missing list as no callers', () => {
    expect(parseCallers(undefined)).toEqual([]);
    expect(parseCallers(' , ')).toEqual([]);
  });

  it('parses peers: known apps, https (http only for localhost), trailing slash dropped', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const peers = parsePeers(
      'founderfit=https://ff.example.com/, prismscore=http://localhost:4100, inkeep=http://evil.example.com, nobody=https://x.example, istartup=not a url',
    );
    expect([...peers]).toEqual([
      ['founderfit', 'https://ff.example.com'],
      ['prismscore', 'http://localhost:4100'],
    ]);
  });

  it('accepts only a well-formed CONNECT_KEY', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseConnectKey(PRISM)).toBe(PRISM);
    expect(parseConnectKey(` ${PRISM} `)).toBe(PRISM);
    expect(parseConnectKey('swc_short')).toBeNull();
    expect(parseConnectKey(undefined)).toBeNull();
    expect(connectConfig({ CONNECT_KEY: PRISM, CONNECT_PEERS: 'founderfit=https://ff.example' }).peers.size).toBe(1);
  });
});

describe('Connect caller verification', () => {
  const auth = (key: string, subject = 'Founder@Example.com') => headers({ authorization: `Bearer ${key}`, 'x-connect-subject': subject });

  it('accepts a listed caller with the scope, and lower-cases the subject', () => {
    expect(verifyCaller(auth(PRISM), 'certificates', callers)).toEqual({ ok: true, caller: 'prismscore', subject: 'founder@example.com' });
  });

  it('401s a missing header, another scheme, or a token of the wrong shape', () => {
    for (const h of [
      headers({}),
      headers({ authorization: `Basic ${PRISM}` }),
      headers({ authorization: 'Bearer swc_tooshort' }),
      headers({ authorization: `Bearer ${PRISM}x` }),
      headers({ authorization: `Bearer ${PRISM.replace('swc_', 'swx_')}` }),
    ]) {
      expect(verifyCaller(h, 'summary', callers)).toMatchObject({ ok: false, status: 401, error: 'unauthorized' });
    }
  });

  it('401s a well-formed key that is not listed', () => {
    expect(verifyCaller(auth(newKey()), 'summary', callers)).toMatchObject({ ok: false, status: 401, error: 'unauthorized' });
    expect(verifyCaller(auth(PRISM), 'summary', [])).toMatchObject({ ok: false, status: 401 });
  });

  it('403s a listed caller without the scope', () => {
    expect(verifyCaller(auth(FF), 'certificates', callers)).toEqual({ ok: false, status: 403, error: 'forbidden', caller: 'founderfit' });
  });

  it('checks the scope before the subject', () => {
    expect(verifyCaller(auth(FF, 'not-an-email'), 'certificates', callers)).toMatchObject({ status: 403 });
  });

  it('400s a missing, malformed or over-long subject', () => {
    const long = `${'a'.repeat(60)}@${'b'.repeat(190)}.com`;
    for (const subject of ['', 'no-at-sign', 'a@b', 'two@@example.com', 'sp ace@example.com', long]) {
      expect(verifyCaller(auth(PRISM, subject), 'summary', callers)).toMatchObject({ ok: false, status: 400, error: 'bad_subject' });
    }
  });
});

describe('Connect provider shell', () => {
  const request = (h: Record<string, string>) => new Request('http://local/api/connect/v1/summary', { headers: h });

  it('answers a valid caller, no-store, and logs a subject hash, never the email', async () => {
    const lines: string[] = [];
    const answer = vi.fn(async () => ({ app: 'istartup', found: false }));
    const res = await handleConnectRequest(
      request({ authorization: `Bearer ${PRISM}`, 'x-connect-subject': 'dana@example.com' }),
      'summary',
      answer,
      { callers, log: (l) => lines.push(l) },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ app: 'istartup', found: false });
    expect(answer).toHaveBeenCalledWith('dana@example.com');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('caller=prismscore');
    expect(lines[0]).toContain(`subject=${subjectHash('dana@example.com')}`);
    expect(lines[0]).toContain('found=false');
    expect(lines.join('\n')).not.toContain('dana@');
  });

  it('refuses without looking anyone up', async () => {
    const answer = vi.fn(async () => ({ found: true }));
    const res = await handleConnectRequest(request({ 'x-connect-subject': 'dana@example.com' }), 'summary', answer, {
      callers,
      log: () => {},
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ error: 'unauthorized' });
    expect(answer).not.toHaveBeenCalled();
  });

  it('turns a failed lookup into a bare 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await handleConnectRequest(
      request({ authorization: `Bearer ${PRISM}`, 'x-connect-subject': 'dana@example.com' }),
      'summary',
      async () => {
        throw new Error('firestore down');
      },
      { callers, log: () => {} },
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'unavailable' });
  });
});

describe('proxy', () => {
  it('never intercepts the Connect API (route handlers check their own callers)', () => {
    expect(proxyConfig.matcher.some((m) => m.startsWith('/api'))).toBe(false);
  });
});
