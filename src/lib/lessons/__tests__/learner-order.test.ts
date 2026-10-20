import { describe, expect, it } from 'vitest';

import { learnerOrder } from '@/lib/lessons/learner-order';

const opts = ['a', 'b', 'c', 'd'];

describe('learnerOrder', () => {
  it('is stable for one founder on one lesson', () => {
    expect(learnerOrder(opts, 'user-1', 'les_1')).toEqual(learnerOrder(opts, 'user-1', 'les_1'));
  });

  it('keeps every option exactly once', () => {
    expect([...learnerOrder(opts, 'user-1', 'les_1')].sort()).toEqual(opts);
  });

  it('gives co-founders different orders across a course', () => {
    const lessons = Array.from({ length: 8 }, (_, i) => `les_${i}`);
    const differs = lessons.filter((l) => learnerOrder(opts, 'user-1', l).join() !== learnerOrder(opts, 'user-2', l).join());
    expect(differs.length).toBeGreaterThan(4);
  });

  it('leaves the order alone without a founder', () => {
    expect(learnerOrder(opts, undefined, 'les_1')).toEqual(opts);
  });
});
