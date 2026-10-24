
/**
 * @fileOverview Turns the model's raw PCM into a file a browser will stream.
 *
 * Gemini's TTS models return `audio/L16;codec=pcm;rate=24000` — signed 16-bit
 * little-endian samples, one channel, no container. That is not something a
 * `<audio>` element can play and not something worth keeping: at 48,000 bytes
 * per second, half an hour of narration is 86 MB.
 *
 * ── Why MP3 rather than WAV ──
 *
 * Wrapping the PCM in a 44-byte WAV header is free and dependency-less, and
 * that was the first version. It was also unusable: a ten-minute document came
 * to 29 MB, which is a slow download on a laptop and an actively hostile one on
 * a phone, and it is stored per document per revision. The same audio at 64
 * kbps mono MP3 is a sixth of the size (measured: 6.0×) and mono speech at 24
 * kHz has nothing above 12 kHz for the encoder to lose — the ceiling is the
 * model's sample rate, not the bitrate.
 *
 * The encoder is `@breezystack/lamejs`, pure JavaScript. Deliberately not
 * ffmpeg or `lame`: this runs in the App Hosting container, where there is no
 * system binary to shell out to and no way to ship one.
 */

/** The model's output format. Not configurable — it is what the API returns. */
export const PCM_SAMPLE_RATE = 24_000;
const BYTES_PER_SAMPLE = 2;

/** Mono speech; anything higher spends bytes on bandwidth the source lacks. */
const MP3_BITRATE_KBPS = 64;

/** One MPEG frame's worth of samples — what the encoder wants per call. */
const SAMPLES_PER_FRAME = 1_152;

export const NARRATION_CONTENT_TYPE = 'audio/mpeg';

/** Seconds of speech in a raw PCM buffer, at the model's fixed sample rate. */
export function pcmSeconds(bytes: number): number {
  return bytes / (PCM_SAMPLE_RATE * BYTES_PER_SAMPLE);
}

/**
 * Decodes one `data:audio/L16;...;base64,` URI from the model into raw samples.
 *
 * Returns null rather than throwing for anything that is not 16-bit PCM: a
 * model that answered with text instead of audio (a refusal, a safety block) is
 * a chunk to retry, not a crash, and the caller already has to handle a missing
 * chunk.
 */
export function pcmFromDataUri(url: string | undefined): Buffer | null {
  if (!url) return null;
  // `[\s\S]` rather than `.` with the `s` flag: tsconfig targets ES2017, where
  // `dotAll` is not available.
  const match = /^data:(audio\/[^;,]+)[^,]*,([\s\S]*)$/.exec(url);
  if (!match) return null;
  // `audio/L16` is the documented type; `audio/pcm` appears from some
  // model versions for the identical payload. The gemini-3.x TTS models wrap
  // the same samples in a WAV container instead.
  if (/^audio\/(wav|x-wav|wave)$/i.test(match[1])) return pcmFromWav(Buffer.from(match[2], 'base64'));
  if (!/^audio\/(l16|pcm)$/i.test(match[1])) return null;
  const buffer = Buffer.from(match[2], 'base64');
  return buffer.length >= BYTES_PER_SAMPLE ? buffer : null;
}

/**
 * The samples inside a WAV file — only if they are exactly what every other
 * chunk is (16-bit PCM, mono, PCM_SAMPLE_RATE).
 *
 * Anything else is refused rather than converted: a chunk at another rate
 * spliced into the recording would play at the wrong speed and pitch, and a
 * refused chunk is retried like any other.
 */
export function pcmFromWav(wav: Buffer): Buffer | null {
  if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') return null;
  let format: { audioFormat: number; channels: number; rate: number; bits: number } | null = null;
  let at = 12;
  while (at + 8 <= wav.length) {
    const id = wav.toString('ascii', at, at + 4);
    const size = wav.readUInt32LE(at + 4);
    const body = at + 8;
    if (id === 'fmt ' && size >= 16) {
      format = {
        audioFormat: wav.readUInt16LE(body),
        channels: wav.readUInt16LE(body + 2),
        rate: wav.readUInt32LE(body + 4),
        bits: wav.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      if (!format || format.audioFormat !== 1 || format.channels !== 1 || format.rate !== PCM_SAMPLE_RATE || format.bits !== 16) {
        return null;
      }
      // A streamed WAV can declare a size past the end; take what is there.
      const data = wav.subarray(body, Math.min(body + size, wav.length));
      return data.length >= BYTES_PER_SAMPLE ? Buffer.from(data) : null;
    }
    at = body + size + (size % 2); // chunks are word-aligned
  }
  return null;
}

/**
 * Encodes concatenated PCM chunks into a single MP3.
 *
 * The chunks are joined BEFORE encoding rather than encoded separately and
 * concatenated after. Joining encoded MP3s leaves each part's encoder padding
 * and its Xing/LAME frame in the middle of the stream, which players render as
 * a gap or a click at every seam — and with one seam per TTS request, a long
 * document would tick its way through.
 *
 * An odd trailing byte is dropped: a half sample is not a sample, and passing
 * one through `Int16Array` would read a byte past the buffer.
 */
export async function encodeNarrationMp3(
  chunks: Buffer[],
  options: {
    /**
     * Silence between chunks. Chunks are cut at paragraph boundaries, where a
     * person reading aloud would pause; without it one paragraph runs straight
     * into the next. Default 0, so existing recordings are unchanged.
     */
    gapMs?: number;
  } = {},
): Promise<Buffer> {
  const gapBytes = Math.round(((options.gapMs ?? 0) / 1000) * PCM_SAMPLE_RATE) * BYTES_PER_SAMPLE;
  const pcm =
    gapBytes > 0 && chunks.length > 1
      ? Buffer.concat(
          chunks.flatMap((chunk, i) => {
            // Whole samples only, so the silence lands on a sample boundary.
            const even = chunk.subarray(0, chunk.length - (chunk.length % BYTES_PER_SAMPLE));
            return i < chunks.length - 1 ? [even, Buffer.alloc(gapBytes)] : [even];
          }),
        )
      : Buffer.concat(chunks);
  const usable = pcm.length - (pcm.length % BYTES_PER_SAMPLE);
  if (usable <= 0) throw new Error('No audio was produced.');

  // A dynamic import so the encoder is pulled in only when a recording is
  // actually made — it is a sizeable pure-JS bundle, and every other route in
  // /api/knowledge would otherwise pay for it. Matches how the routes import
  // their flows.
  type Lame = { Mp3Encoder: new (channels: number, rate: number, kbps: number) => { encodeBuffer(s: Int16Array): Uint8Array; flush(): Uint8Array } };
  const lame = (await import('@breezystack/lamejs')) as unknown as Lame & { default?: Lame };
  const { Mp3Encoder } = lame.default ?? lame;

  const samples = new Int16Array(
    pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + usable),
  );
  const encoder = new Mp3Encoder(1, PCM_SAMPLE_RATE, MP3_BITRATE_KBPS);

  const parts: Buffer[] = [];
  for (let at = 0; at < samples.length; at += SAMPLES_PER_FRAME) {
    const frame = encoder.encodeBuffer(samples.subarray(at, at + SAMPLES_PER_FRAME));
    if (frame.length) parts.push(Buffer.from(frame));
  }
  const tail = encoder.flush();
  if (tail.length) parts.push(Buffer.from(tail));

  const mp3 = Buffer.concat(parts);
  if (!mp3.length) throw new Error('The recording could not be encoded.');
  return mp3;
}
