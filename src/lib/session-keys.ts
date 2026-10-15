import { randomBytes } from 'node:crypto';

import { col, isAlreadyExists, isDatabaseConfigured, nowIso } from '@/lib/db';

/**
 * Signing keys for admin and founder session cookies.
 *
 * Env vars win when set (`ADMIN_SESSION_SECRET` / `ADMIN_PASSWORD` for admins,
 * `AUTH_SECRET` for founders). Otherwise the keys are generated once and kept in
 * Firestore at `istartup_config/session_keys`, so a deploy needs no secrets at all.
 * Rotating that document signs everyone out.
 */

interface Keys {
  admin: string;
  user: string;
}

let cached: Promise<Keys> | null = null;

async function storedKeys(): Promise<Keys> {
  const ref = col('config').doc('session_keys');
  const snap = await ref.get();
  if (snap.exists) return snap.data() as Keys;
  const fresh: Keys = {
    admin: randomBytes(48).toString('base64url'),
    user: randomBytes(48).toString('base64url'),
  };
  try {
    await ref.create({ ...fresh, created_at: nowIso() });
    return fresh;
  } catch (error) {
    // Another instance created them first — use theirs.
    if (isAlreadyExists(error)) return (await ref.get()).data() as Keys;
    throw error;
  }
}

async function resolveKeys(): Promise<Keys> {
  const envAdmin = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  const envUser = process.env.AUTH_SECRET || envAdmin;
  if (envAdmin && envUser) return { admin: envAdmin, user: envUser };
  if (isDatabaseConfigured()) {
    const stored = await storedKeys();
    return { admin: envAdmin || stored.admin, user: envUser || stored.user };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('No session keys: set AUTH_SECRET / ADMIN_SESSION_SECRET or connect Firestore.');
  }
  return { admin: 'dev-only-secret', user: 'dev-only-user-secret' };
}

export function sessionKeys(): Promise<Keys> {
  cached ??= resolveKeys().catch((error) => {
    cached = null;
    throw error;
  });
  return cached;
}
