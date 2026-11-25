import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { signSession, verifySession } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/email';
import {
  EMAIL_VERIFY_MAX_AGE_S,
  RESEND_LIMIT,
  admitResend,
  emailVerifyTokenMatches,
  readEmailVerifyToken,
  reserveResend,
  sendVerificationEmail,
  signEmailVerifyToken,
  type ResendLog,
} from '@/lib/email-verification';
import { parseUserSession, signUserSession, userSecret } from '@/lib/user-auth';

const USER = { id: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f', email: 'dana@example.com' };

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-user-secret';
  process.env.ADMIN_SESSION_SECRET = 'test-admin-secret';
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('email verification tokens', () => {
  it('verify for the user and address they were issued for', async () => {
    const token = await signEmailVerifyToken(USER.id, USER.email);
    expect(await readEmailVerifyToken(token)).toMatchObject({ userId: USER.id });
    expect(await emailVerifyTokenMatches(token, USER)).toBe(true);
    expect(await emailVerifyTokenMatches(token, { ...USER, email: 'DANA@example.com' })).toBe(true);
  });

  it('stop working once the account email differs, or for another account', async () => {
    const token = await signEmailVerifyToken(USER.id, USER.email);
    expect(await emailVerifyTokenMatches(token, { ...USER, email: 'other@example.com' })).toBe(false);
    expect(await emailVerifyTokenMatches(token, { ...USER, id: 'someone-else' })).toBe(false);
  });

  it('expire after 24 hours', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T00:00:00Z'));
    const token = await signEmailVerifyToken(USER.id, USER.email);
    vi.setSystemTime(new Date(Date.parse('2026-11-26T00:00:00Z') + EMAIL_VERIFY_MAX_AGE_S * 1000 - 1000));
    expect(await readEmailVerifyToken(token)).not.toBeNull();
    vi.setSystemTime(new Date(Date.parse('2026-11-26T00:00:00Z') + EMAIL_VERIFY_MAX_AGE_S * 1000 + 1000));
    expect(await readEmailVerifyToken(token)).toBeNull();
  });

  it('are not session cookies, and session cookies are not verification tokens', async () => {
    const verify = await signEmailVerifyToken(USER.id, USER.email);
    expect(await parseUserSession(verify)).toBeNull();
    const session = await signUserSession(USER.id);
    expect(await readEmailVerifyToken(session)).toBeNull();
    // Even a session-key-signed token shaped like a verification subject is refused.
    const forged = await signSession(`ev1:${USER.id}:${'0'.repeat(24)}`, await userSecret(), 3600);
    expect(await readEmailVerifyToken(forged)).toBeNull();
  });

  it('reject tampered, empty and oversized input', async () => {
    const token = await signEmailVerifyToken(USER.id, USER.email);
    const [payload, sig] = token.split('.');
    expect(await readEmailVerifyToken(`${payload}x.${sig}`)).toBeNull();
    expect(await readEmailVerifyToken(`${payload}.${sig.slice(0, -2)}AA`)).toBeNull();
    expect(await readEmailVerifyToken('')).toBeNull();
    expect(await readEmailVerifyToken(null)).toBeNull();
    expect(await readEmailVerifyToken('a'.repeat(500))).toBeNull();
  });

  it('carry no readable email address', async () => {
    const token = await signEmailVerifyToken(USER.id, USER.email);
    const payload = Buffer.from(token.split('.')[0], 'base64url').toString();
    expect(payload).not.toContain('dana');
    // and are signed with a key of their own (the plain user secret doesn't verify them)
    expect(await verifySession(token, await userSecret())).toBeNull();
  });
});

describe('verification email resend limit', () => {
  const t0 = Date.parse('2026-11-26T12:00:00Z');
  const min = 60_000;

  it('allows three in an hour, refuses the fourth, and frees up as the window rolls', () => {
    let history: string[] = [];
    for (let i = 0; i < RESEND_LIMIT; i++) {
      const r = admitResend(history, t0 + i * min);
      expect(r.ok).toBe(true);
      history = r.history;
    }
    const refused = admitResend(history, t0 + 10 * min);
    expect(refused).toMatchObject({ ok: false, retryAfterS: 50 * 60 });
    expect(admitResend(history, t0 + 60 * min + 1).ok).toBe(true);
  });

  it('prunes old entries and ignores garbage', () => {
    const r = admitResend(['not a date', new Date(t0 - 2 * 60 * min).toISOString()], t0);
    expect(r).toEqual({ ok: true, history: [new Date(t0).toISOString()] });
  });

  it('persists through the log, per user', async () => {
    const stored = new Map<string, string[]>();
    const log: ResendLog = {
      async transact(userId, fn) {
        const { history, result } = fn(stored.get(userId) ?? []);
        stored.set(userId, history);
        return result;
      },
    };
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await reserveResend('u1', log, t0 + i * min)).ok);
    expect(results).toEqual([true, true, true, false]);
    expect((await reserveResend('u2', log, t0)).ok).toBe(true);
    expect(stored.get('u1')).toHaveLength(3);
  });
});

describe('sending the verification email', () => {
  it('posts to the MoreWerx partner email API as iStartup', async () => {
    vi.stubEnv('MOREWERX_API_URL', 'https://morewerx.example/');
    vi.stubEnv('MOREWERX_PARTNER_KEY', 'mwp_test');
    const fetchStub = vi.fn(async () => new Response('{}', { status: 200 }));
    expect(await sendEmail('dana@example.com', 'Subject', 'Body', fetchStub as unknown as typeof fetch)).toBe('sent');
    const [url, init] = fetchStub.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://morewerx.example/api/partner/v1/email');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer mwp_test');
    expect(JSON.parse(String(init.body))).toEqual({ to: 'dana@example.com', subject: 'Subject', text: 'Body', fromName: 'iStartup' });
  });

  it('treats EMAIL_OFF as off and other refusals as failed', async () => {
    vi.stubEnv('MOREWERX_API_URL', 'https://morewerx.example');
    vi.stubEnv('MOREWERX_PARTNER_KEY', 'mwp_test');
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const off = async () => new Response(JSON.stringify({ code: 'EMAIL_OFF' }), { status: 409 });
    const bad = async () => new Response('{}', { status: 500 });
    expect(await sendEmail('a@b.co', 's', 't', off as unknown as typeof fetch)).toBe('off');
    expect(await sendEmail('a@b.co', 's', 't', bad as unknown as typeof fetch)).toBe('failed');
  });

  it('unconfigured: logs without the address or link, and prints the link only outside production', async () => {
    vi.stubEnv('MOREWERX_API_URL', '');
    vi.stubEnv('MOREWERX_PARTNER_KEY', '');
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    vi.stubEnv('NODE_ENV', 'production');
    expect(await sendVerificationEmail({ ...USER, full_name: 'Dana Okonjo' }, 'https://istartupscore.com')).toBe('off');
    const prodLines = info.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(prodLines).toContain('(not configured)');
    expect(prodLines).not.toContain('dana@');
    expect(prodLines).not.toContain('verify-email?token=');

    info.mockClear();
    vi.stubEnv('NODE_ENV', 'development');
    await sendVerificationEmail(USER, 'http://localhost:3000');
    const devLines = info.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(devLines).toContain('http://localhost:3000/api/auth/verify-email?token=');
    expect(devLines).not.toContain('dana@');
  });
});
