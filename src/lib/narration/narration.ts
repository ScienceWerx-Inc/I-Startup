/**
 * Turning written lesson text into words a voice should read, and
 * fingerprinting what a recording says — from ScienceWerx's
 * src/lib/lms/lesson-media.ts, where both the browser voice and the recorded
 * narration read through these.
 *
 * Pure and client-safe: the player computes the same fingerprint the server
 * stored, so a recording is matched to text by its words, never its position.
 */

/**
 * Written shorthand that reads badly aloud, rewritten the way a person would
 * say it. Applied to the words a voice reads, never to what is shown.
 */
const SPOKEN: [RegExp, string][] = [
  [/https?:\/\/\S+|www\.\S+/gi, 'the link in the lesson'],
  [/\be\.g\.,?/gi, 'for example,'],
  [/\bi\.e\.,?/gi, 'that is,'],
  [/\betc\./gi, 'and so on.'],
  [/\bvs\.?(?=\s)/gi, 'versus'],
  [/\s(?:->|→|=>)\s/g, ' leads to '],
  [/\s&\s/g, ' and '],
  [/\band\/or\b/gi, 'and or'],
  // input/output, not TCP/IP or km/h
  [/(?<=\b[a-z]{3,})\/(?=[a-z]{3,}\b)/g, ' or '],
];

export function speakable(text: string): string {
  let out = text;
  for (const [pattern, spoken] of SPOKEN) out = out.replace(pattern, spoken);
  return out.replace(/[ \t]{2,}/g, ' ');
}

/**
 * Fingerprint of what a recording says and in which voice.
 *
 * A fast 53-bit string hash (cyrb53), not a cryptographic one: it only has to
 * notice that the text changed, and being pure means the browser can compute
 * it too — the same value the server stored when it made the recording.
 */
export function narrationFingerprint(script: string, voice: string): string {
  const input = `${voice}\u0000${script}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
