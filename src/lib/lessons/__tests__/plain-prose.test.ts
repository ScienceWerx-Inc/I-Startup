import { describe, expect, it } from 'vitest';

import { toPlainParagraphs } from '@/lib/lessons/plain-prose';

describe('toPlainParagraphs', () => {
  it('keeps blank-line paragraphs and joins soft-wrapped lines inside them', () => {
    expect(toPlainParagraphs('One idea\ncontinues here.\n\nSecond idea.')).toBe('One idea continues here.\n\nSecond idea.');
  });

  it('treats single newlines as paragraph breaks when the body has no blank line at all', () => {
    expect(toPlainParagraphs('First paragraph.\nSecond paragraph.\nThird.')).toBe('First paragraph.\n\nSecond paragraph.\n\nThird.');
  });

  it('strips markdown and html the model was told not to use', () => {
    expect(toPlainParagraphs('## Heading\n\n**Bold** text.\n\n<p>Para</p>')).toBe('Heading\n\nBold text.\n\nPara');
  });
});
