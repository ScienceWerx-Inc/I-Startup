/**
 * Reads a passage aloud with Gemini's TTS — ScienceWerx's
 * src/ai/flows/narrateDoc.ts, with the Genkit instance and model passed in so
 * any host (Google AI or Vertex AI) can use it.
 *
 * The model returns raw 16-bit PCM, never a playable file; `audio-encode.ts`
 * makes the MP3. Server-only.
 *
 * NO STYLE INSTRUCTION IS SENT. Gemini's TTS accepts a delivery instruction
 * ahead of the text, but on a SHORT passage it reads the instruction out
 * instead (measured in ScienceWerx: 2 of 6 runs spoke it aloud; bare text, 6 of
 * 6 read exactly the passage). Narration here is a slide at a time — short —
 * so the text goes to the model bare. Pick the voice for character instead.
 */

import { pcmFromDataUri, pcmSeconds } from './audio-encode';

/** The slice of a Genkit instance this needs. */
export interface TtsGenerator {
  generate(options: {
    model: string;
    prompt: string;
    config: Record<string, unknown>;
  }): Promise<{
    message?: { content: { media?: { url?: string; contentType?: string } }[] } | null;
    usage?: { inputTokens?: number; outputTokens?: number };
  }>;
}

/**
 * Gemini TTS models by provider. On Vertex AI the preview id answers 500; the
 * GA id works with the same request.
 */
export const TTS_MODELS = {
  googleai: 'googleai/gemini-2.5-flash-preview-tts',
  vertexai: 'vertexai/gemini-2.5-flash-tts',
} as const;

/**
 * Prebuilt Gemini voices worth narrating with, by character. Men's voices
 * first; a face should get a voice that matches it.
 */
export const NARRATION_VOICES = [
  { id: 'Sadaltager', label: 'Sadaltager', hint: 'Knowledgeable, male' },
  { id: 'Charon', label: 'Charon', hint: 'Informative, male' },
  { id: 'Algenib', label: 'Algenib', hint: 'Gravelly, male' },
  { id: 'Iapetus', label: 'Iapetus', hint: 'Clear, male' },
  { id: 'Sulafat', label: 'Sulafat', hint: 'Warm, female' },
  { id: 'Kore', label: 'Kore', hint: 'Firm, female' },
  { id: 'Gacrux', label: 'Gacrux', hint: 'Mature, female' },
] as const;

/** One retry: a second attempt separates a transient failure from a refusal cheaply. */
const ATTEMPTS = 2;
const RATE_LIMIT_WAITS = 2;
const RATE_LIMIT_MAX_WAIT_MS = 30_000;

/**
 * How long to wait before retrying, when `message` is a rate-limit refusal —
 * the API's own suggested delay plus a little jitter, capped — else null.
 */
export function rateLimitWaitMs(message: string): number | null {
  if (!/RESOURCE_EXHAUSTED|429|rate.?limit|quota/i.test(message)) return null;
  const suggested = /retry in ([\d.]+)s/i.exec(message) ?? /"retryDelay":\s*"(\d+)s"/i.exec(message);
  const seconds = suggested ? Number(suggested[1]) : 10;
  const ms = Math.min((Number.isFinite(seconds) ? seconds : 10) * 1000, RATE_LIMIT_MAX_WAIT_MS);
  return Math.round(ms + Math.random() * 1_500);
}

export interface NarratedPassage {
  /** Raw 16-bit little-endian PCM at 24 kHz, mono. */
  pcm: Buffer;
  seconds: number;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Synthesises one passage. Throws when the model returns no audio twice — a
 * refusal or a persistent failure; the caller falls back to another voice.
 */
export async function narratePassage(
  ai: TtsGenerator,
  text: string,
  options: { model: string; voice: string },
): Promise<NarratedPassage> {
  let lastError = '';
  let rateWaits = 0;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await ai.generate({
        model: options.model,
        prompt: text,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: options.voice } } },
        },
      });

      const media = response.message?.content.find((part) => part.media)?.media;
      const pcm = pcmFromDataUri(media?.url);
      if (pcm) {
        return {
          pcm,
          seconds: pcmSeconds(pcm.length),
          usage: { inputTokens: response.usage?.inputTokens ?? 0, outputTokens: response.usage?.outputTokens ?? 0 },
        };
      }
      // Audio was asked for and prose came back: a refusal or a safety block.
      lastError = media?.contentType ? `unexpected audio format ${media.contentType}` : 'no audio in the response';
    } catch (err) {
      lastError = String((err as Error)?.message ?? err);
      // A per-minute quota is a wait, not a failure: honour "retry in Ns" without spending an attempt.
      const wait = rateLimitWaitMs(lastError);
      if (wait !== null && rateWaits < RATE_LIMIT_WAITS) {
        rateWaits += 1;
        attempt -= 1;
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }

  throw new Error(`Narration failed: ${lastError}`);
}
