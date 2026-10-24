/**
 * What drives the hologram's mouth: how loud the voice is right now and the
 * shape its lips make (mouth-shape.ts), read once per animation frame.
 *
 * Two sources, because a lesson speaks in two ways:
 *
 * - `MediaVoice` — a recording playing in an <audio> element. Its output runs
 *   through a Web Audio analyser, so the jaw follows the real envelope and the
 *   lips the real spectrum, exactly as Einstein's live voice does in
 *   ScienceWerx (lib/jarvis/audio-engine.ts).
 * - `SyntheticVoice` — the browser's speechSynthesis, which never exposes its
 *   audio. The mouth is driven by a syllable-rate rhythm instead, closing
 *   briefly at each word boundary the utterance reports, which reads as
 *   talking at a glance and never claims to be more.
 *
 * Levels are never React state: the scene reads `levels()` per frame.
 */

import { mouthShape, type MouthShape } from './mouth-shape';

export interface AudioLevels {
  /** 0..1, the listener's mic. Lessons don't listen, so always 0 there. */
  mic: number;
  /** 0..1, the voice being played. */
  out: number;
  /** Lip shape of the voice being played, for the hologram's mouth. */
  shape?: MouthShape;
}

export const SILENT: AudioLevels = { mic: 0, out: 0 };

export interface VoiceSource {
  levels(): AudioLevels;
}

/**
 * An AudioContext, made inside the user's click or key press — iOS Safari keeps
 * one created later suspended, and a suspended context silences every element
 * routed through it.
 */
export function createVoiceContext(): AudioContext {
  const Ctor: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor({ latencyHint: 'playback' });
  void ctx.resume().catch(() => {});
  return ctx;
}

const SILENT_DB = -100;

function rmsDb(samples: Float32Array): number {
  if (samples.length === 0) return SILENT_DB;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / samples.length);
  return rms <= 0 ? SILENT_DB : Math.max(SILENT_DB, 20 * Math.log10(rms));
}

/** 0..1 for the jaw, mapped from the dB range speech lives in. */
function levelFromDb(db: number): number {
  const floor = -70;
  const ceiling = -10;
  if (db <= floor) return 0;
  if (db >= ceiling) return 1;
  return (db - floor) / (ceiling - floor);
}

/** Fast attack, slower release: the jaw jumps with a syllable and settles smoothly. */
const ease = (prev: number, next: number) => prev + (next - prev) * (next > prev ? 0.5 : 0.12);

/**
 * Lip-sync from a media element. `createMediaElementSource` may be called only
 * once per element, so keep one element and change its `src` per clip. The
 * element must be same-origin (or CORS-enabled), or the analyser reads silence.
 */
export class MediaVoice implements VoiceSource {
  private analyser: AnalyserNode;
  private source: MediaElementAudioSourceNode;
  private time = new Float32Array(1024);
  private freq = new Float32Array(512);
  private smoothed: AudioLevels = { mic: 0, out: 0 };

  constructor(
    element: HTMLMediaElement,
    readonly ctx: AudioContext,
  ) {
    this.source = ctx.createMediaElementSource(element);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.5;
    this.source.connect(this.analyser);
    this.analyser.connect(ctx.destination);
  }

  levels(): AudioLevels {
    this.analyser.getFloatTimeDomainData(this.time as Float32Array<ArrayBuffer>);
    const out = levelFromDb(rmsDb(this.time));
    let shape: MouthShape = { wide: 0, round: 0 };
    if (out > 0.04) {
      this.analyser.getFloatFrequencyData(this.freq as Float32Array<ArrayBuffer>);
      shape = mouthShape(this.freq, this.ctx.sampleRate / this.analyser.fftSize);
    }
    this.smoothed = { mic: 0, out: ease(this.smoothed.out, out), shape };
    return this.smoothed;
  }

  dispose(): void {
    try {
      this.source.disconnect();
      this.analyser.disconnect();
    } catch {
      // Already torn down.
    }
  }
}

/** A speaking rhythm for a voice whose audio can't be read (speechSynthesis). */
export class SyntheticVoice implements VoiceSource {
  private speaking = false;
  private gapUntil = 0;
  private smoothed: AudioLevels = { mic: 0, out: 0 };

  start(): void {
    this.speaking = true;
  }

  stop(): void {
    this.speaking = false;
  }

  /** A word boundary (SpeechSynthesisUtterance `boundary`): the lips close for a beat. */
  boundary(): void {
    this.gapUntil = performance.now() + 70;
  }

  levels(): AudioLevels {
    const now = performance.now();
    const t = now / 1000;
    let out = 0;
    let shape: MouthShape = { wide: 0, round: 0 };
    if (this.speaking && now >= this.gapUntil) {
      // Roughly four to five syllables a second, with a slower phrase swell.
      out = 0.22 + 0.4 * Math.abs(Math.sin(t * 13.5)) * (0.65 + 0.35 * Math.sin(t * 2.9));
      shape = {
        wide: Math.max(0, Math.sin(t * 4.1) * 0.6),
        round: Math.max(0, Math.sin(t * 3.3 + 1.7) * 0.5),
      };
    }
    this.smoothed = { mic: 0, out: ease(this.smoothed.out, out), shape };
    return this.smoothed;
  }
}
