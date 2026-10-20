import { seededShuffle } from '@/features/assessment/domain';

/**
 * A per-founder order for a lesson self-check's options: the same founder always sees the
 * same order on that lesson, and co-founders on one course see different ones. Pure and
 * client-safe (FNV-1a over the two ids seeds the assessment brick's shuffle).
 */
export function learnerSeed(learnerId: string, lessonId: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${learnerId}:${lessonId}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function learnerOrder<T>(items: readonly T[], learnerId: string | undefined, lessonId: string): T[] {
  return learnerId ? seededShuffle(items, learnerSeed(learnerId, lessonId)) : items.slice();
}
