import { createHash } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';

import { col, nowIso } from '@/lib/db';

/**
 * The memoization layer under course generation: every model call (outline, lesson, quiz)
 * is cached by a hash of exactly what was sent — model, temperature, output shape and the
 * full prompt text. The prompt already carries every input (the startup, its gaps and
 * answers, the lessons before it), so:
 *
 *   - the same request is never paid for twice: a founder retaking the assessment with the
 *     same answers, a step retried after a crashed request, or an admin re-running a build
 *     gets the stored result instantly;
 *   - nothing crosses between founders: a different startup, answer or prompt is a
 *     different key, and a prompt edit invalidates its old entries by itself;
 *   - concurrent identical calls (two tabs on one course) share one model request.
 *
 * Only successful, schema-valid outputs are stored; a cached value that no longer parses
 * against its schema is ignored and regenerated.
 */

export interface MemoEntry {
  kind: string;
  value: unknown;
  created_at: string;
  last_hit_at?: string;
  hits: number;
}

/** Where entries live; Firestore in the app, a Map in tests. */
export interface MemoStore {
  get(key: string): Promise<MemoEntry | null>;
  set(key: string, entry: MemoEntry): Promise<void>;
  hit(key: string): Promise<void>;
}

export const firestoreMemoStore: MemoStore = {
  async get(key) {
    const snap = await col('aiCache').doc(key).get();
    return snap.exists ? (snap.data() as MemoEntry) : null;
  },
  async set(key, entry) {
    await col('aiCache').doc(key).set(entry);
  },
  async hit(key) {
    await col('aiCache').doc(key).update({ hits: FieldValue.increment(1), last_hit_at: nowIso() });
  },
};

export interface MemoRequest {
  /** 'outline' | 'lesson' | 'quiz' — for stats, and part of the key. */
  kind: string;
  model: string;
  temperature: number;
  /** Bump when the output schema changes shape, so old entries are not reused. */
  schemaVersion: string;
  prompt: string;
}

export const memoKey = (r: MemoRequest) =>
  createHash('sha256')
    .update(JSON.stringify([r.kind, r.model, r.temperature, r.schemaVersion, r.prompt]))
    .digest('hex');

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Returns the cached output for this exact request, or runs `generate` once, stores its
 * result and returns it. `parse` validates a cached value (return null to reject it).
 */
export async function memoize<T>(
  request: MemoRequest,
  generate: () => Promise<T>,
  parse: (value: unknown) => T | null,
  store: MemoStore = firestoreMemoStore,
): Promise<T> {
  const key = memoKey(request);
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const run = (async () => {
    // The cache is an optimisation: if it cannot be read or written, generate anyway.
    const cached = await store.get(key).catch(() => null);
    const valid = cached ? parse(cached.value) : null;
    if (valid !== null) {
      await store.hit(key).catch(() => {});
      return valid;
    }
    const value = await generate();
    await store
      .set(key, { kind: request.kind, value: JSON.parse(JSON.stringify(value)), created_at: nowIso(), hits: 0 })
      .catch((error) => console.error('AI cache write failed:', error));
    return value;
  })();

  inFlight.set(key, run);
  try {
    return await run;
  } finally {
    inFlight.delete(key);
  }
}
