import { describe, expect, it, vi } from 'vitest';

import { aiPrices, costOf, usageFrom } from '@/lib/ai-pricing';
import { letterFor } from '@/lib/gap-course/grades';
import { cofoundersNeeded, validateCofounders } from '@/modules/istartup-score/onboarding/cofounders';

vi.mock('@/lib/db', () => ({ col: () => { throw new Error('not in tests'); }, nowIso: () => '' }));
vi.mock('@/brico/lms', () => ({ lmsRepos: () => ({}) }));
vi.mock('@/brico/assessment', () => ({ assessmentRepos: () => ({}) }));

describe('letterFor', () => {
  it('maps percent to A–F with 70 as the pass line', () => {
    expect([100, 90, 89, 80, 79, 70, 69, 60, 59, 0].map(letterFor)).toEqual(['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D', 'F', 'F']);
  });
});

describe('costOf', () => {
  it('prices input and output (thinking billed as output) per million tokens', () => {
    const prices = { model: 'm', inputPerM: 0.3, outputPerM: 2.5 };
    expect(costOf({ inputTokens: 1_000_000, outputTokens: 0, thoughtsTokens: 0 }, prices)).toBeCloseTo(0.3);
    expect(costOf({ inputTokens: 0, outputTokens: 600_000, thoughtsTokens: 400_000 }, prices)).toBeCloseTo(2.5);
    expect(costOf({ inputTokens: 4000, outputTokens: 2000, thoughtsTokens: 1000 }, prices)).toBeCloseTo(0.0087);
  });

  it('reads missing usage fields as zero, and env overrides the default rates', () => {
    expect(usageFrom({ inputTokens: 5 })).toEqual({ inputTokens: 5, outputTokens: 0, thoughtsTokens: 0 });
    vi.stubEnv('AI_PRICE_INPUT_PER_M', '1');
    expect(aiPrices().inputPerM).toBe(1);
    vi.unstubAllEnvs();
    expect(aiPrices().inputPerM).toBe(0.3);
  });
});

describe('co-founders', () => {
  const row = (n: number) => ({ name: `Founder ${n}`, email: `f${n}@example.com`, phone: '+20 100 000 000' });
  it('asks for founders − 1 (4+ means at least three), none for a solo founder', () => {
    expect([undefined, 'Solo founder', '2', '3', '4+'].map(cofoundersNeeded)).toEqual([0, 0, 1, 2, 3]);
  });

  it('accepts exactly the right number of complete rows', () => {
    expect(validateCofounders('3', JSON.stringify([row(1), row(2)])).ok).toBe(true);
    expect(validateCofounders('3', JSON.stringify([row(1)])).ok).toBe(false);
    expect(validateCofounders('2', JSON.stringify([row(1), row(2)])).ok).toBe(false);
    expect(validateCofounders('4+', JSON.stringify([row(1), row(2), row(3), row(4)])).ok).toBe(true);
    expect(validateCofounders('Solo founder', undefined)).toEqual({ ok: true, cofounders: [] });
  });

  it('rejects bad emails or phones, duplicates, and the lead listing themselves', () => {
    expect(validateCofounders('2', JSON.stringify([{ ...row(1), email: 'nope' }])).ok).toBe(false);
    expect(validateCofounders('2', JSON.stringify([{ ...row(1), phone: 'call me' }])).ok).toBe(false);
    expect(validateCofounders('3', JSON.stringify([row(1), row(1)])).ok).toBe(false);
    expect(validateCofounders('2', JSON.stringify([row(1)]), 'F1@example.com').ok).toBe(false);
  });
});
