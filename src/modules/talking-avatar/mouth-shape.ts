/**
 * Rough visemes from the speaking voice's spectrum, for the hologram's lips.
 *
 * Not phoneme recognition — a cheap, convincing approximation from three
 * bands of the output audio: "ee"/"s"-like sounds carry energy high and
 * spread the mouth wide; "oo"/"o"-like sounds sit low and round it. Loudness
 * (how far the jaw opens) is measured separately.
 */

export interface MouthShape {
  /** 0..1: lips spread (ee, s, i). */
  wide: number;
  /** 0..1: lips rounded and pushed forward (oo, o, w). */
  round: number;
}

const BANDS = { low: [150, 700], mid: [700, 2200], high: [2500, 7000] } as const;

/** `db` is AnalyserNode.getFloatFrequencyData output; `binHz` = sampleRate / fftSize. */
export function mouthShape(db: Float32Array, binHz: number): MouthShape {
  const power = (lo: number, hi: number) => {
    let sum = 0;
    const a = Math.max(1, Math.floor(lo / binHz));
    const b = Math.min(db.length - 1, Math.ceil(hi / binHz));
    for (let i = a; i <= b; i++) sum += Math.pow(10, db[i] / 10);
    return sum;
  };
  const low = power(...BANDS.low);
  const mid = power(...BANDS.mid);
  const high = power(...BANDS.high);
  const total = low + mid + high;
  // Too quiet to read a shape from: a neutral mouth.
  if (!(total > 1e-9)) return { wide: 0, round: 0 };
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return {
    wide: clamp(((high + mid * 0.25) / total - 0.12) * 3.2),
    round: clamp((low / total - 0.62) * 2.6),
  };
}
