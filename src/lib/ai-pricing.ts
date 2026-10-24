/**
 * What our model calls cost. Gemini 2.5 Flash on Vertex AI, USD per million tokens:
 * input $0.30, output $2.50 — thinking tokens bill as output. Override with
 * AI_PRICE_INPUT_PER_M / AI_PRICE_OUTPUT_PER_M when prices change; the admin cost report
 * prints the rates it used. Pure, no imports.
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  /** Reasoning tokens; billed at the output rate. */
  thoughtsTokens: number;
}

const rate = (env: string | undefined, fallback: number) => {
  const n = Number.parseFloat(env ?? '');
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export function aiPrices() {
  return {
    model: 'Gemini 2.5 Flash (Vertex AI)',
    inputPerM: rate(process.env.AI_PRICE_INPUT_PER_M, 0.3),
    outputPerM: rate(process.env.AI_PRICE_OUTPUT_PER_M, 2.5),
  };
}

/**
 * Gemini 2.5 Flash TTS on Vertex AI (slide narration), USD per million tokens: text
 * input $0.50, audio output $10 (25 audio tokens a second). Override with
 * AI_TTS_PRICE_INPUT_PER_M / AI_TTS_PRICE_OUTPUT_PER_M.
 */
export function ttsPrices() {
  return {
    model: 'Gemini 2.5 Flash TTS (Vertex AI)',
    inputPerM: rate(process.env.AI_TTS_PRICE_INPUT_PER_M, 0.5),
    outputPerM: rate(process.env.AI_TTS_PRICE_OUTPUT_PER_M, 10),
  };
}

/** USD for one call's tokens. */
export function costOf(usage: TokenUsage, prices = aiPrices()): number {
  return (usage.inputTokens * prices.inputPerM + (usage.outputTokens + usage.thoughtsTokens) * prices.outputPerM) / 1_000_000;
}

/** Genkit's usage block as our three counts (absent fields are zero). */
export function usageFrom(raw: { inputTokens?: number; outputTokens?: number; thoughtsTokens?: number } | undefined): TokenUsage {
  return {
    inputTokens: raw?.inputTokens ?? 0,
    outputTokens: raw?.outputTokens ?? 0,
    thoughtsTokens: raw?.thoughtsTokens ?? 0,
  };
}
