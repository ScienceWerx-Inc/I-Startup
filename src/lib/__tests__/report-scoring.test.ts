import { describe, expect, it } from 'vitest';

import { ReportPayloadSchema, scoreAnswers, storedAnswers, type ReportRow } from '@/lib/reports';
import { scoreCertificateFrom } from '@/lib/score-certificate';
import { QUESTIONS } from '@/modules/istartup-score/assessment/bank';
import { computeReport, type Answers } from '@/modules/istartup-score/assessment/scoring';

const all = (value: number): Answers => Object.fromEntries(QUESTIONS.map((q) => [q.id, value]));

const payload = (answers: unknown, extra: Record<string, unknown> = {}) => ({
  startupName: 'Acme',
  profile: { name: 'Acme', description: 'Widgets' },
  answers,
  ...extra,
});

describe('ReportPayloadSchema (server-side scoring)', () => {
  it('accepts a complete answer set and strips any client-sent score fields', () => {
    const parsed = ReportPayloadSchema.parse(payload(all(3), { finalScore: 500, scores: [{ category: 'X', score: 100 }], band: 'investment_ready' }));
    expect(parsed).not.toHaveProperty('finalScore');
    expect(parsed).not.toHaveProperty('scores');
    expect(parsed).not.toHaveProperty('band');
  });

  it('rejects unknown question ids', () => {
    expect(ReportPayloadSchema.safeParse(payload({ ...all(3), not_a_question: 5 })).success).toBe(false);
  });

  it('rejects values outside 1–5 and non-integers', () => {
    const id = QUESTIONS[0].id;
    expect(ReportPayloadSchema.safeParse(payload({ ...all(3), [id]: 0 })).success).toBe(false);
    expect(ReportPayloadSchema.safeParse(payload({ ...all(3), [id]: 6 })).success).toBe(false);
    expect(ReportPayloadSchema.safeParse(payload({ ...all(3), [id]: 2.5 })).success).toBe(false);
  });

  it('rejects an incomplete answer set', () => {
    const partial = all(4);
    delete partial[QUESTIONS[0].id];
    expect(ReportPayloadSchema.safeParse(payload(partial)).success).toBe(false);
  });
});

describe('scoreAnswers', () => {
  it('matches the report screen arithmetic (computeReport)', () => {
    const answers = Object.fromEntries(QUESTIONS.map((q, i) => [q.id, (i % 5) + 1])) as Answers;
    const report = computeReport({ name: 'Acme', description: '' }, answers);
    expect(scoreAnswers(answers)).toEqual({
      scores: report.categories.map((c) => ({ category: c.title, score: c.percent })),
      final_score: report.finalScore,
      band: report.band.code,
    });
  });

  it('gives the extremes', () => {
    expect(scoreAnswers(all(5))).toMatchObject({ final_score: 500, band: 'investment_ready' });
    expect(scoreAnswers(all(1))).toMatchObject({ final_score: 100, band: 'early_stage' });
  });
});

describe('storedAnswers', () => {
  it('drops unknown ids and malformed values', () => {
    const id = QUESTIONS[0].id;
    expect(storedAnswers({ [id]: 4, bogus: 5, [QUESTIONS[1].id]: 9 })).toEqual({ [id]: 4 });
    expect(storedAnswers(null)).toEqual({});
    expect(storedAnswers([5, 5])).toEqual({});
  });
});

describe('scoreCertificateFrom', () => {
  const row = (over: Partial<ReportRow>): ReportRow => ({
    id: '3f2b6c1e-0000-4000-8000-000000000000',
    user_id: 'u1',
    app_id: null,
    startup_name: 'Acme',
    profile: {},
    company_info: null,
    answers: all(1),
    scores: [],
    final_score: 100,
    band: 'early_stage',
    country: null,
    region: null,
    city: null,
    created_at: '2026-11-01T00:00:00.000Z',
    ...over,
  });

  it('prints the score the answers earn, not a forged stored one', () => {
    const cert = scoreCertificateFrom(row({ final_score: 500, band: 'investment_ready', scores: [{ category: 'Management', score: 100 }] }));
    expect(cert.score).toBe(100);
    expect(cert.band).toBe('Early stage');
    expect(cert.dimensions.every((d) => d.percent === 20)).toBe(true);
  });

  it('counts missing or malformed answers as zero', () => {
    expect(scoreCertificateFrom(row({ answers: { bogus: 5 }, final_score: 480 })).score).toBe(0);
  });
});
