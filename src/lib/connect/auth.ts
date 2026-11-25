import { createHash, timingSafeEqual } from 'node:crypto';

import { KEY_SHAPE, type CallerEntry } from './env';
import type { ConnectScope } from './types';

/**
 * Who is calling a Connect endpoint, checked in the order the spec fixes:
 *   1. bearer token shape            → 401 unauthorized
 *   2. sha256(token) in CONNECT_CALLERS (constant-time) → 401 unauthorized
 *   3. the entry carries the scope   → 403 forbidden
 *   4. X-Connect-Subject is an email → 400 bad_subject
 */

export type CallerCheck =
  | { ok: true; caller: string; subject: string }
  | { ok: false; status: 401 | 403 | 400; error: 'unauthorized' | 'forbidden' | 'bad_subject'; caller?: string };

export const sha256 = (value: string) => createHash('sha256').update(value).digest();

/** A deliberately plain email check: one @, no spaces, a dot in the domain, ≤ 254 characters. */
const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]+$/;
export const isEmailSubject = (value: string) => value.length <= 254 && EMAIL.test(value);

/** Compares against every entry (no early exit), so timing doesn't reveal which matched. */
function findCaller(token: string, callers: readonly CallerEntry[]): CallerEntry | null {
  const digest = sha256(token);
  let found: CallerEntry | null = null;
  for (const entry of callers) {
    if (entry.hash.length === digest.length && timingSafeEqual(entry.hash, digest) && !found) found = entry;
  }
  return found;
}

export function verifyCaller(
  headers: Pick<Headers, 'get'>,
  scope: ConnectScope,
  callers: readonly CallerEntry[],
): CallerCheck {
  const auth = headers.get('authorization') ?? '';
  const match = /^Bearer (\S+)$/.exec(auth.trim());
  const token = match?.[1] ?? '';
  if (!KEY_SHAPE.test(token)) return { ok: false, status: 401, error: 'unauthorized' };

  const caller = findCaller(token, callers);
  if (!caller) return { ok: false, status: 401, error: 'unauthorized' };
  if (!caller.scopes.has(scope)) return { ok: false, status: 403, error: 'forbidden', caller: caller.name };

  const subject = (headers.get('x-connect-subject') ?? '').trim().toLowerCase();
  if (!isEmailSubject(subject)) return { ok: false, status: 400, error: 'bad_subject', caller: caller.name };

  return { ok: true, caller: caller.name, subject };
}

/** What logs carry instead of the email: a short, stable hash. */
export const subjectHash = (email: string) => sha256(email.trim().toLowerCase()).toString('hex').slice(0, 16);
