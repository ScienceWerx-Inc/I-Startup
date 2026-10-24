import { describe, expect, it } from 'vitest';

import { EXERCISE_PREFIX } from '@/lib/gap-course/shared';
import { learnerSlides, slideSpeech } from '@/lib/lessons/deck';
import { NARRATOR, slideClipHash, slideClipUrl } from '@/lib/lessons/narrator';
import { narrationFingerprint, speakable } from '@/lib/narration/narration';

const lesson = {
  body: [
    'Customers pay for outcomes. Features are only the means.',
    'Interview five customers before you build anything.',
    `${EXERCISE_PREFIX}Write down the outcome your first customer is paying for.`,
  ].join('\n\n'),
  keyPoints: ['Talk to customers first', 'Sell outcomes, not features'],
  checkpoint: { id: 'c1', stem: 'What do customers pay for?', options: [], correctOptionIds: [] },
};

describe('learnerSlides', () => {
  it('gives the exercise its own slide before the self-check, and keeps it out of the prose', () => {
    const slides = learnerSlides(lesson, 'Selling outcomes');
    const task = slides.findIndex((s) => s.kind === 'concept' && s.title === 'Apply it to your startup');
    const check = slides.findIndex((s) => s.kind === 'check');
    expect(task).toBeGreaterThan(0);
    expect(check).toBe(task + 1);
    const prose = slides.filter((s, i) => s.kind === 'concept' && i !== task).flatMap((s) => (s.kind === 'concept' ? s.points : []));
    expect(prose.join(' ')).not.toContain(EXERCISE_PREFIX);
  });

  it('is the same deck every time, so the player and the narration route agree on slide indexes', () => {
    const a = learnerSlides(lesson, 'Selling outcomes').map((s) => slideSpeech(s));
    const b = learnerSlides({ ...lesson }, 'Selling outcomes').map((s) => slideSpeech(s));
    expect(a).toEqual(b);
  });
});

describe('slideSpeech', () => {
  it('reads key points as a spoken run, not bullets', () => {
    expect(slideSpeech({ kind: 'keypoints', title: 'Key points', points: ['Ship early', 'Measure it'] })).toBe(
      'Here are the key points to remember. First, Ship early. And finally, Measure it.',
    );
  });

  it("prefers the deck's own script, made speakable", () => {
    expect(slideSpeech({ kind: 'check', say: 'Pick one, e.g. the cheapest.' })).toBe('Pick one, for example, the cheapest.');
  });
});

describe('clip fingerprints', () => {
  it('change with the words and the voice', () => {
    const h = slideClipHash('Hello founders.');
    expect(h).toBe(narrationFingerprint('Hello founders.', NARRATOR.voice));
    expect(h).not.toBe(slideClipHash('Hello founder.'));
    expect(h).not.toBe(narrationFingerprint('Hello founders.', 'Kore'));
  });

  it('match what the narration route validates', () => {
    const url = new URL(slideClipUrl('gap_x', 'les_y', 2, 'Hello founders.'), 'http://localhost');
    expect(url.searchParams.get('h')).toMatch(/^[0-9a-z]{1,16}$/);
    expect(url.searchParams.get('slide')).toBe('2');
  });

  it('speakable spells out shorthand', () => {
    expect(speakable('Pricing vs. value & input/output')).toBe('Pricing versus value and input or output');
  });
});
