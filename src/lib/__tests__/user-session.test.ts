import { beforeAll, describe, expect, it } from 'vitest';

import { signSession } from '@/lib/admin-auth';
import { parseUserSession, resolveUserSession, signUserSession, userSecret, verifyUserSession } from '@/lib/user-auth';

interface FakeUser {
  id: string;
  session_version?: number;
}

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-user-secret';
  process.env.ADMIN_SESSION_SECRET = 'test-admin-secret';
});

/** An in-memory `istartup_users`. */
function store(users: FakeUser[]) {
  const rows = new Map(users.map((u) => [u.id, u]));
  return {
    rows,
    load: async (id: string) => rows.get(id) ?? null,
  };
}

describe('founder sessions', () => {
  it('resolves a fresh session to its user', async () => {
    const db = store([{ id: 'u1' }]);
    const cookie = await signUserSession('u1');
    expect((await resolveUserSession(cookie, db.load))?.id).toBe('u1');
    expect(await verifyUserSession(cookie)).toBe('u1');
  });

  it('rejects a validly signed session whose account no longer exists', async () => {
    const db = store([{ id: 'u1' }]);
    const cookie = await signUserSession('u1');
    db.rows.delete('u1');
    expect(await resolveUserSession(cookie, db.load)).toBeNull();
  });

  it('revokes every earlier session when session_version is bumped', async () => {
    const db = store([{ id: 'u1' }]);
    const before = await signUserSession('u1', 0);
    db.rows.set('u1', { id: 'u1', session_version: 1 });
    expect(await resolveUserSession(before, db.load)).toBeNull();
    // A sign-in after the bump carries the new version.
    const after = await signUserSession('u1', 1);
    expect((await resolveUserSession(after, db.load))?.id).toBe('u1');
  });

  it('accepts pre-versioning cookies (bare user id) as version 0', async () => {
    const legacy = await signSession('u1', await userSecret(), 60);
    expect(await parseUserSession(legacy)).toEqual({ userId: 'u1', version: 0 });
    expect((await resolveUserSession(legacy, store([{ id: 'u1' }]).load))?.id).toBe('u1');
    expect(await resolveUserSession(legacy, store([{ id: 'u1', session_version: 2 }]).load)).toBeNull();
  });

  it('rejects tampered, expired and missing cookies without touching the store', async () => {
    let loads = 0;
    const load = async (): Promise<FakeUser> => {
      loads++;
      return { id: 'u1' };
    };
    const cookie = await signUserSession('u1');
    const [payload, sig] = cookie.split('.');
    const forged = `${btoa(`u2:v0:${Date.now() + 60_000}`).replace(/=+$/, '')}.${sig}`;
    expect(await resolveUserSession(forged, load)).toBeNull();
    expect(await resolveUserSession(`${payload}.AAAA`, load)).toBeNull();
    expect(await resolveUserSession(await signSession('u1:v0', await userSecret(), -1), load)).toBeNull();
    expect(await resolveUserSession(undefined, load)).toBeNull();
    expect(loads).toBe(0);
  });
});
