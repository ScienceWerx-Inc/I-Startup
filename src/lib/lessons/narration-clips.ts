import { ai } from '@/ai/genkit';
import { ttsPrices } from '@/lib/ai-pricing';
import { recordAiUsage } from '@/lib/ai-usage';
import { col, nowIso } from '@/lib/db';
import { encodeNarrationMp3 } from '@/lib/narration/server/audio-encode';
import { narratePassage, TTS_MODELS } from '@/lib/narration/server/tts';

import { NARRATOR, slideClipHash } from './narrator';

/**
 * Recorded slide narration, made on first listen and kept in Firestore by the
 * fingerprint of its words and voice (`istartup_narration_clips`). The same
 * words are recorded once for every founder who hears them; an edited slide
 * has new words, so a new fingerprint, so a new recording — never stale audio.
 *
 * MP3 at 64 kbps: a 1,200-character slide is about 80 s, ~640 KB, inside a
 * Firestore document. Server-only.
 */

/** Room under Firestore's 1 MiB document limit for the other fields. */
const STORE_MAX_BYTES = 950_000;

interface ClipRow {
  mp3: Buffer;
  seconds: number;
  voice: string;
  characters: number;
  created_at: string;
}

export interface Clip {
  mp3: Buffer;
  seconds: number;
}

/** Recordings already in progress on this instance, so two listeners don't pay twice. */
const inFlight = new Map<string, Promise<Clip>>();

export async function slideClip(speech: string): Promise<Clip> {
  const hash = slideClipHash(speech);
  const ref = col('narrationClips').doc(hash);
  const stored = await ref.get();
  if (stored.exists) {
    const row = stored.data() as ClipRow;
    return { mp3: Buffer.from(row.mp3), seconds: row.seconds };
  }

  const pending = inFlight.get(hash);
  if (pending) return pending;
  const work = record(speech, hash).finally(() => inFlight.delete(hash));
  inFlight.set(hash, work);
  return work;
}

async function record(speech: string, hash: string): Promise<Clip> {
  const started = Date.now();
  const passage = await narratePassage(ai, speech, { model: TTS_MODELS.vertexai, voice: NARRATOR.voice });
  recordAiUsage({
    feature: 'narration',
    cache: 'miss',
    usage: { ...passage.usage, thoughtsTokens: 0 },
    durationMs: Date.now() - started,
    // Not a course's generation cost: a recording is made once and shared by every founder who hears it.
    courseId: null,
    prices: ttsPrices(),
  });

  const mp3 = await encodeNarrationMp3([passage.pcm]);
  const clip = { mp3, seconds: Math.round(passage.seconds * 10) / 10 };
  if (mp3.length <= STORE_MAX_BYTES) {
    const row: ClipRow = { mp3, seconds: clip.seconds, voice: NARRATOR.voice, characters: speech.length, created_at: nowIso() };
    await col('narrationClips')
      .doc(hash)
      .set(row)
      .catch((error) => console.error('Narration clip write failed:', error));
  }
  return clip;
}
