import { describe, expect, it } from 'vitest';

import { normalizeFlowchart } from '@/lib/lessons/mermaid-source';

describe('normalizeFlowchart', () => {
  it('splits a single-line flowchart into statements (the Grok course map)', () => {
    const flat =
      'graph LR A[Grok Bot Overview] --> B[Account Creation] B --> J[Distinguishing Platforms] B --> C[Basic Setup] C --> D[Gmail Integration]';
    expect(normalizeFlowchart(flat)).toBe(
      [
        'graph LR',
        '  A[Grok Bot Overview] --> B[Account Creation]',
        '  B --> J[Distinguishing Platforms]',
        '  B --> C[Basic Setup]',
        '  C --> D[Gmail Integration]',
      ].join('\n'),
    );
  });

  it('keeps chains, edge labels, other arrows and & groups in one statement', () => {
    const flat = 'flowchart TD a --> b -->|then| c d -.-> e f & g ==> h';
    expect(normalizeFlowchart(flat)).toBe(
      ['flowchart TD', '  a --> b -->|then| c', '  d -.-> e', '  f & g ==> h'].join('\n'),
    );
  });

  it('handles arrows written without spaces and ids with hyphens', () => {
    expect(normalizeFlowchart('graph LR tok-basics[Tokens]-->llm[LLMs] llm-->out')).toBe(
      ['graph LR', '  tok-basics[Tokens] --> llm[LLMs]', '  llm --> out'].join('\n'),
    );
  });

  it('treats ; as a statement end', () => {
    expect(normalizeFlowchart('graph LR; A --> B; B --> C')).toBe('graph LR\n  A --> B\n  B --> C');
  });

  it('leaves a well-formed multi-line map alone', () => {
    const ok = 'graph LR\na[One] --> b[Two]\nb --> c[Three]';
    expect(normalizeFlowchart(ok)).toBe(ok);
  });

  it('adds only the missing header break when the body is already multi-line', () => {
    expect(normalizeFlowchart('graph LR a --> b\nb --> c')).toBe('graph LR\na --> b\nb --> c');
  });

  it('strips a markdown fence', () => {
    expect(normalizeFlowchart('```mermaid\ngraph LR\na --> b\n```')).toBe('graph LR\na --> b');
  });

  it('returns what it cannot safely split unchanged', () => {
    const sub = 'graph LR subgraph S[Group] a --> b end';
    expect(normalizeFlowchart(sub)).toBe(sub);
    const seq = 'sequenceDiagram Alice->>Bob: Hi';
    expect(normalizeFlowchart(seq)).toBe(seq);
    const broken = 'graph LR --> a';
    expect(normalizeFlowchart(broken)).toBe(broken);
  });

  it('is idempotent', () => {
    const once = normalizeFlowchart('graph LR A[x] --> B[y] B --> C');
    expect(normalizeFlowchart(once)).toBe(once);
  });

  it('quotes labels that contain brackets (the Grok "tasks" diagram)', () => {
    const src = 'graph TD\n    A[User Goal (Vague)] --> B{Break Down into Precise Tasks}\n    C1 --> D1[Grok Bot 1 (or Master Bot)]';
    expect(normalizeFlowchart(src)).toBe(
      'graph TD\n    A["User Goal (Vague)"] --> B{Break Down into Precise Tasks}\n    C1 --> D1["Grok Bot 1 (or Master Bot)"]',
    );
  });

  it('quotes a bracketed decision label, escaping inner quotes', () => {
    expect(normalizeFlowchart('graph LR\nA{Is it (really) "done"?} --> B')).toBe(
      'graph LR\nA{"Is it (really) #quot;done#quot;?"} --> B',
    );
  });

  it('leaves real bracket shapes and already-quoted labels alone', () => {
    const src = 'graph LR\ndb[(Database)] --> s[[Subroutine]]\nq["Already (quoted)"] --> r([Stadium])';
    expect(normalizeFlowchart(src)).toBe(src);
  });

  it('splits and quotes in one pass', () => {
    expect(normalizeFlowchart('graph LR A[Start (here)] --> B[End]')).toBe(
      'graph LR\n  A["Start (here)"] --> B[End]',
    );
  });
});

