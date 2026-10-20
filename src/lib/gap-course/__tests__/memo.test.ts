import { describe, expect, it, vi } from 'vitest';

import { memoize, memoKey, type MemoEntry, type MemoRequest, type MemoStore } from '../memo';

vi.mock('@/lib/db', () => ({ col: () => { throw new Error('not in tests'); }, nowIso: () => '2026-10-20T00:00:00.000Z' }));

function memoryStore(): MemoStore & { entries: Map<string, MemoEntry> } {
  const entries = new Map<string, MemoEntry>();
  return {
    entries,
    get: async (k) => entries.get(k) ?? null,
    set: async (k, e) => void entries.set(k, e),
    hit: async (k) => void entries.set(k, { ...entries.get(k)!, hits: entries.get(k)!.hits + 1 }),
  };
}

const req = (prompt: string, over: Partial<MemoRequest> = {}): MemoRequest => ({
  kind: 'lesson', model: 'm', temperature: 0.7, schemaVersion: '1', prompt, ...over,
});
const asText = (v: unknown) => (typeof v === 'string' ? v : null);

describe('memoize', () => {
  it('calls the model once for the same request, then serves the stored result', async () => {
    const store = memoryStore();
    const generate = vi.fn(async () => ({ value: 'lesson body' }));
    expect(await memoize(req('p'), generate, asText, store)).toBe('lesson body');
    expect(await memoize(req('p'), generate, asText, store)).toBe('lesson body');
    expect(generate).toHaveBeenCalledTimes(1);
    expect([...store.entries.values()][0].hits).toBe(1);
  });

  it('treats any difference in the request as a different key', () => {
    const base = memoKey(req('p'));
    expect(memoKey(req('p '))).not.toBe(base);
    expect(memoKey(req('p', { temperature: 0.6 }))).not.toBe(base);
    expect(memoKey(req('p', { model: 'other' }))).not.toBe(base);
    expect(memoKey(req('p', { schemaVersion: '2' }))).not.toBe(base);
    expect(memoKey(req('p', { kind: 'quiz' }))).not.toBe(base);
  });

  it('shares one model call between concurrent identical requests', async () => {
    const store = memoryStore();
    let release!: (v: string) => void;
    const generate = vi.fn(() => new Promise<{ value: string }>((r) => (release = (v: string) => r({ value: v }))));
    const both = Promise.all([memoize(req('p'), generate, asText, store), memoize(req('p'), generate, asText, store)]);
    await new Promise((r) => setTimeout(r, 0));
    release('once');
    expect(await both).toEqual(['once', 'once']);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('regenerates when the stored value no longer parses, and never stores a failure', async () => {
    const store = memoryStore();
    store.entries.set(memoKey(req('p')), { kind: 'lesson', value: 42, created_at: '', hits: 0 });
    expect(await memoize(req('p'), async () => ({ value: 'fresh' }), asText, store)).toBe('fresh');
    await expect(memoize(req('q'), async () => { throw new Error('model down'); }, asText, store)).rejects.toThrow('model down');
    expect(store.entries.has(memoKey(req('q')))).toBe(false);
  });

  it('reports a miss with its usage, then a hit that carries what it saved', async () => {
    const store = memoryStore();
    const usage = { inputTokens: 1000, outputTokens: 400, thoughtsTokens: 200 };
    const outcomes: Array<{ cache: string; usage: unknown }> = [];
    const onOutcome = (o: { cache: string; usage: unknown }) => outcomes.push({ cache: o.cache, usage: o.usage });
    await memoize(req('p'), async () => ({ value: 'v', usage }), asText, store, onOutcome);
    await memoize(req('p'), async () => ({ value: 'never', usage }), asText, store, onOutcome);
    expect(outcomes).toEqual([
      { cache: 'miss', usage },
      { cache: 'hit', usage },
    ]);
  });

  it('still generates when the cache itself is unavailable', async () => {
    const broken: MemoStore = { get: async () => { throw new Error('offline'); }, set: async () => { throw new Error('offline'); }, hit: async () => {} };
    expect(await memoize(req('p'), async () => ({ value: 'ok' }), asText, broken)).toBe('ok');
  });
});
