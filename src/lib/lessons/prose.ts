/**
 * A lesson body as reading blocks.
 *
 * The stored body is plain prose — blank-line paragraphs, sometimes a list or
 * a heading-like line, often one enormous paragraph straight from the
 * generator. This gives it shape without reinterpreting it as markdown: only
 * structure a writer plainly meant (list markers, `#` headings, a short
 * standalone title line) is recognised, walls of text are split at sentence
 * boundaries, and one summing-up sentence may be lifted out as a takeaway.
 * Every word of the body appears exactly once, in order.
 *
 * Deterministic and class-free (styling lives in the component — Tailwind does
 * not scan src/lib).
 */

export type ProseBlock =
  | { kind: 'lead'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'takeaway'; text: string };

export interface ProseSegment {
  text: string;
  /** `code` from backticks, `term` from a short quoted phrase. */
  mark?: 'code' | 'term';
}

/** Sentences per reading chunk, at most. */
const CHUNK_MAX = 4;
const HEADING_MAX = 80;
const WORDS_PER_MINUTE = 220;

const LIST_ITEM = /^\s*(?:[-*•–]|(\d+)[.)])\s+(.*)$/;
const HASH_HEADING = /^\s*#{1,4}\s+(.*)$/;
const ABBREVIATION = /(?:\b(?:e\.g|i\.e|etc|vs|cf|approx|Mr|Mrs|Ms|Dr|St|No)\.|\b[A-Z]\.)$/;
const TAKEAWAY_CUE =
  /^(?:In essence|In short|In summary|In other words|Put simply|Simply put|Ultimately|The key (?:idea|point|takeaway)|The bottom line|Remember|This is why|That is why)\b/i;

/** Sentences, kept whole — never split after "e.g." or an initial. */
export function proseSentences(paragraph: string): string[] {
  // Split at whitespace after terminal punctuation, so no text can fall between matches.
  const raw = paragraph.split(/(?<=[.!?]["'”’)]*)\s+/);
  const out: string[] = [];
  for (const piece of raw) {
    const s = piece.trim();
    if (!s) continue;
    const prev = out[out.length - 1];
    if (prev && ABBREVIATION.test(prev)) out[out.length - 1] = `${prev} ${s}`;
    else out.push(s);
  }
  return out;
}

/** Split sentences into near-equal chunks of at most CHUNK_MAX. */
function chunk(sentences: string[]): string[][] {
  if (sentences.length <= CHUNK_MAX + 1) return [sentences];
  const count = Math.ceil(sentences.length / CHUNK_MAX);
  const size = sentences.length / count;
  const out: string[][] = [];
  for (let i = 0; i < count; i++) out.push(sentences.slice(Math.round(i * size), Math.round((i + 1) * size)));
  return out.filter((c) => c.length);
}

function looksLikeHeading(line: string, isLastParagraph: boolean): boolean {
  const s = line.trim();
  if (isLastParagraph || s.length > HEADING_MAX || s.includes('\n')) return false;
  if (/[.!?,;]$/.test(s)) return false;
  // A title, not a fragment of a sentence: starts upper-case, a handful of words.
  return /^[A-Z0-9“"']/.test(s) && s.split(/\s+/).length <= 12;
}

export function proseBlocks(body: string): ProseBlock[] {
  const paragraphs = body
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks: ProseBlock[] = [];
  const pushText = (text: string) => {
    const sentences = proseSentences(text.replace(/\s+/g, ' '));
    for (const group of chunk(sentences)) blocks.push({ kind: 'paragraph', text: group.join(' ') });
  };

  paragraphs.forEach((paragraph, p) => {
    const lines = paragraph.split('\n');
    let prose: string[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;
    const flushProse = () => {
      if (prose.length) pushText(prose.join(' '));
      prose = [];
    };
    const flushList = () => {
      if (list?.items.length) blocks.push({ kind: 'list', ...list });
      list = null;
    };

    // A paragraph that is one short title-like line heads what follows it.
    if (lines.length === 1 && looksLikeHeading(lines[0]!, p === paragraphs.length - 1)) {
      blocks.push({ kind: 'heading', text: lines[0]!.trim().replace(/:$/, '') });
      return;
    }

    for (const line of lines) {
      const hash = line.match(HASH_HEADING);
      const item = line.match(LIST_ITEM);
      if (hash) {
        flushProse();
        flushList();
        blocks.push({ kind: 'heading', text: hash[1]!.trim() });
      } else if (item) {
        flushProse();
        const ordered = Boolean(item[1]);
        if (list && list.ordered !== ordered) flushList();
        list ??= { ordered, items: [] };
        list.items.push(item[2]!.trim());
      } else if (list && /^\s{2,}\S/.test(line)) {
        // An indented continuation of the previous item.
        list.items[list.items.length - 1] += ` ${line.trim()}`;
      } else {
        flushList();
        if (line.trim()) prose.push(line.trim());
      }
    }
    flushProse();
    flushList();
  });

  liftTakeaway(blocks);

  const first = blocks.findIndex((b) => b.kind === 'paragraph');
  if (first !== -1 && first <= 1) blocks[first] = { kind: 'lead', text: (blocks[first] as { text: string }).text };
  return blocks;
}

/**
 * One summing-up sentence ("In essence, …") becomes a takeaway in place — the
 * paragraph splits around it, nothing is duplicated. Only in a lesson long
 * enough that a visual pause helps, and never out of the opening paragraph.
 */
function liftTakeaway(blocks: ProseBlock[]): void {
  const paragraphs = blocks.filter((b) => b.kind === 'paragraph').length;
  if (paragraphs < 3) return;
  for (let i = blocks.length - 1; i > 0; i--) {
    const block = blocks[i]!;
    if (block.kind !== 'paragraph') continue;
    const sentences = proseSentences(block.text);
    const at = sentences.findIndex((s) => TAKEAWAY_CUE.test(s) && s.length >= 40 && s.length <= 260);
    if (at === -1) continue;
    const before = sentences.slice(0, at).join(' ');
    const after = sentences.slice(at + 1).join(' ');
    const replacement: ProseBlock[] = [];
    if (before) replacement.push({ kind: 'paragraph', text: before });
    replacement.push({ kind: 'takeaway', text: sentences[at]! });
    if (after) replacement.push({ kind: 'paragraph', text: after });
    blocks.splice(i, 1, ...replacement);
    return;
  }
}

/**
 * Inline marks: `code` in backticks, and a short 'quoted' or “quoted” phrase
 * as a term. An apostrophe inside a word (piece's) never opens a quote.
 */
export function proseSegments(text: string): ProseSegment[] {
  const pattern = /`([^`\n]{1,60})`|(?<![\p{L}\p{N}])['‘"“]([^'‘’"“”\n]{2,48})['’"”](?![\p{L}\p{N}])/gu;
  const out: ProseSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at) });
    if (m[1] !== undefined) out.push({ text: m[1], mark: 'code' });
    else out.push({ text: m[2]!, mark: 'term' });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
