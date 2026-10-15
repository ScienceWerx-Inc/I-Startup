import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore, type Query } from 'firebase-admin/firestore';

/**
 * Firestore (Admin SDK) — the only data store. Server-only: every read and write goes
 * through route handlers, and `firestore.rules` denies all client access.
 *
 * Credentials come from Application Default Credentials: on Firebase App Hosting the
 * backend service account and `FIREBASE_CONFIG` are injected automatically; locally,
 * set `GOOGLE_CLOUD_PROJECT` after `gcloud auth application-default login`, or point
 * `FIRESTORE_EMULATOR_HOST` at the emulator.
 *
 * Documents keep the old Postgres column names (snake_case, ISO-string timestamps) so
 * API responses — and the admin console that renders them — are unchanged.
 */

export const COLLECTIONS = {
  users: 'istartup_users',
  /** `{encoded email}` → `{ user_id }`; created atomically with the user to keep emails unique. */
  userEmails: 'istartup_user_emails',
  reports: 'istartup_reports',
  purchases: 'istartup_purchases',
  /** `{encoded email}` → `{ email, password_hash, ... }` admin console accounts. */
  admins: 'istartup_admins',
  config: 'istartup_config',
  /** `{reportId}` → the generation job for that report's gap-closing course. */
  courseJobs: 'istartup_course_jobs',
} as const;

export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_CONFIG ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.FIRESTORE_EMULATOR_HOST,
  );
}

// Kept on globalThis: `proxy.ts` and route handlers are separate bundles that share one
// firebase-admin instance, and `settings()` may only be called once per Firestore.
const cache = globalThis as typeof globalThis & { __istartupFirestore?: Firestore };

export function db(): Firestore {
  if (cache.__istartupFirestore) return cache.__istartupFirestore;
  const firestore = getFirestore(getApps()[0] ?? initializeApp());
  firestore.settings({ ignoreUndefinedProperties: true });
  cache.__istartupFirestore = firestore;
  return firestore;
}

export const col = (name: keyof typeof COLLECTIONS) => db().collection(COLLECTIONS[name]);

export const nowIso = () => new Date().toISOString();

/** Email → document id (emails may contain characters Firestore ids can't). */
export const emailKey = (email: string) => encodeURIComponent(email);

/** Runs a query and returns `{ id, ...data }` rows. */
export async function rows<T>(query: Query): Promise<T[]> {
  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

/** Fetches documents by id from one collection, keyed by id (missing ids are skipped). */
export async function byIds<T>(
  name: keyof typeof COLLECTIONS,
  ids: Iterable<string>,
): Promise<Map<string, T>> {
  const unique = [...new Set(ids)];
  const out = new Map<string, T>();
  if (unique.length === 0) return out;
  const snaps = await db().getAll(...unique.map((id) => col(name).doc(id)));
  for (const s of snaps) if (s.exists) out.set(s.id, { id: s.id, ...s.data() } as T);
  return out;
}

export const newestFirst = <T extends { created_at: string }>(a: T, b: T) =>
  a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;

/** gRPC ALREADY_EXISTS — a `create()` hit an existing document. */
export const isAlreadyExists = (error: unknown) => (error as { code?: number })?.code === 6;

/** Document ids we mint are UUIDs; reject anything else before it reaches a path. */
export const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
