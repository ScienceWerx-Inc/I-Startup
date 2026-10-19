import { describe, expect, it } from 'vitest';

import { proseBlocks, proseSegments, proseSentences, readingMinutes } from '@/lib/lessons/prose';

const words = (blocks: ReturnType<typeof proseBlocks>) =>
  blocks
    .flatMap((b) => ('items' in b ? b.items : [b.text]))
    .join(' ')
    .split(/\s+/);

describe('proseSentences', () => {
  it('does not split after abbreviations or initials', () => {
    expect(proseSentences('Use a flag, e.g. --dry. Then run it. J. Smith agreed.')).toEqual([
      'Use a flag, e.g. --dry.',
      'Then run it.',
      'J. Smith agreed.',
    ]);
  });
});

describe('proseBlocks', () => {
  it('breaks one wall of text into a lead and readable chunks, losing no words', () => {
    const body = Array.from({ length: 22 }, (_, i) => `Sentence number ${i + 1} explains something useful.`).join(' ');
    const blocks = proseBlocks(body);
    expect(blocks[0]!.kind).toBe('lead');
    expect(blocks.length).toBeGreaterThanOrEqual(6);
    for (const b of blocks) if ('text' in b) expect(proseSentences(b.text).length).toBeLessThanOrEqual(4);
    expect(words(blocks)).toEqual(body.split(/\s+/));
  });

  it('lifts one summing-up sentence as a takeaway, in place', () => {
    const para = (n: number) => `Paragraph ${n} starts here. It continues for a while. It ends now.`;
    const body = [para(1), para(2), `${para(3)} In essence, a piece is a complete thought in the organisation's memory. After.`, para(4)].join('\n\n');
    const blocks = proseBlocks(body);
    const takeaways = blocks.filter((b) => b.kind === 'takeaway');
    expect(takeaways).toHaveLength(1);
    expect(takeaways[0]).toMatchObject({ text: expect.stringMatching(/^In essence/) });
    expect(words(blocks)).toEqual(body.split(/\s+/));
  });

  it('recognises lists, # headings and standalone title lines', () => {
    const blocks = proseBlocks('## Setup\nInstall it first.\n\nWhy it matters\n\nThree steps:\n1. Extract\n2. Capture\n- a bullet');
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'lead', 'heading', 'paragraph', 'list', 'list']);
    expect(blocks[4]).toMatchObject({ ordered: true, items: ['Extract', 'Capture'] });
  });

  it('never makes the final line a heading', () => {
    expect(proseBlocks('First para here.\n\nThe end').map((b) => b.kind)).toEqual(['lead', 'paragraph']);
  });
});

describe('proseSegments', () => {
  it('marks code and quoted terms but not apostrophes', () => {
    expect(proseSegments("Run `brico add` or 'brico extract' on the piece's 'what'.")).toEqual([
      { text: 'Run ' },
      { text: 'brico add', mark: 'code' },
      { text: ' or ' },
      { text: 'brico extract', mark: 'term' },
      { text: " on the piece's " },
      { text: 'what', mark: 'term' },
      { text: '.' },
    ]);
  });
});

it('readingMinutes is at least one', () => {
  expect(readingMinutes('short')).toBe(1);
  expect(readingMinutes(Array(660).fill('w').join(' '))).toBe(3);
});
