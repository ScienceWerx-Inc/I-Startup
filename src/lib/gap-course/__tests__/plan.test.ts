import { describe, expect, it } from 'vitest';

import { QUESTIONS } from '@/modules/istartup-score/assessment/bank';
import { planFromAnswers, MAX_MODULES } from '../plan';

const profile = { name: 'Acme', description: 'Invoices for clinics' };
const answersWith = (byCategory: Record<string, number>, fallback = 4) =>
  Object.fromEntries(QUESTIONS.map((q) => [q.id, byCategory[q.category] ?? fallback]));

describe('planFromAnswers', () => {
  it('makes one module per weak dimension, weakest first', () => {
    const plan = planFromAnswers(profile, answersWith({ market: 1, momentum: 2, management: 2 }));
    expect(plan.modules.map((m) => m.key)).toEqual(['market', expect.any(String), expect.any(String)]);
    expect(new Set(plan.modules.map((m) => m.key))).toEqual(new Set(['market', 'momentum', 'management']));
    const percents = plan.modules.map((m) => m.percent);
    expect([...percents].sort((a, b) => a - b)).toEqual(percents);
  });

  it('still gives a strong founder their two lowest dimensions', () => {
    const plan = planFromAnswers(profile, answersWith({ market: 4 }, 5));
    expect(plan.modules).toHaveLength(2);
    expect(plan.modules[0].key).toBe('market');
  });

  it('caps the course at MAX_MODULES', () => {
    const plan = planFromAnswers(profile, answersWith({}, 1));
    expect(plan.modules).toHaveLength(MAX_MODULES);
  });

  it('focuses each module on its own weakest questions with 2–3 lessons', () => {
    const plan = planFromAnswers(profile, answersWith({ market: 2 }));
    for (const m of plan.modules) {
      // A teaching lesson per gap (at least two), plus the closing workshop.
      expect(m.lessonCount).toBe(Math.max(2, m.focus.length) + 1);
      expect(m.focus.length).toBeGreaterThan(0);
      expect(m.focus.length).toBeLessThanOrEqual(3);
      for (const f of m.focus) {
        expect(QUESTIONS.find((q) => q.id === f.questionId)?.category).toBe(m.key);
        expect(f.current).toBe(QUESTIONS.find((q) => q.id === f.questionId)!.options[f.value - 1].label);
        expect(f.better).toHaveLength(5 - f.value);
      }
    }
    const market = plan.modules.find((m) => m.key === 'market')!;
    const pts = market.focus.map((f) => f.recoverablePoints);
    expect([...pts].sort((a, b) => b - a)).toEqual(pts);
  });
});
