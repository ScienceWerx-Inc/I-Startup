/**
 * Choosing the most human-sounding browser voice, for when the listener has
 * not picked one.
 *
 * `speechSynthesis`'s own default is whatever the operating system lists
 * first, which on many machines is an old concatenative voice ("Microsoft
 * David", "Fred") even when a far better neural one is installed right next
 * to it. The good ones announce themselves in their names — Microsoft's
 * "…Online (Natural)", Apple's "(Premium)"/"(Enhanced)" and Siri voices,
 * Chrome's network "Google …" voices — so ranking by name is reliable enough,
 * and a listener's explicit choice always wins over it.
 *
 * Pure and dependency-free: the voice objects are read, never held.
 */

export interface VoiceLike {
  name: string;
  lang: string;
  voiceURI: string;
  localService?: boolean;
  default?: boolean;
}

/** Name markers of the natural-sounding tiers, best first, with their weight. */
const QUALITY: [RegExp, number][] = [
  [/\bnatural\b/i, 60],
  [/\b(premium)\b/i, 55],
  [/\bneural\b/i, 50],
  [/\bsiri\b/i, 45],
  [/\benhanced\b/i, 40],
  [/\bonline\b/i, 30],
  [/^google\b/i, 25],
];

/** The robotic ones, which should lose to almost anything. */
const ROBOTIC = /\b(espeak|fred|albert|zarvox|trinoids|whisper|bells|boing|bubbles|cellos|bad news|good news|jester|organ|superstar|wobble|junior|ralph|kathy|princess|deranged|hysterical)\b/i;

function score(voice: VoiceLike, lang: string): number {
  const want = lang.toLowerCase();
  const have = voice.lang.toLowerCase().replace('_', '-');
  // Language first: a natural voice in the wrong language is worse than a
  // plain one in the right language.
  let points = have === want ? 100 : have.split('-')[0] === want.split('-')[0] ? 80 : 0;
  if (points === 0) return 0;
  for (const [pattern, weight] of QUALITY) {
    if (pattern.test(voice.name)) {
      points += weight;
      break;
    }
  }
  if (ROBOTIC.test(voice.name)) points -= 70;
  if (voice.default) points += 2; // a tiebreak, never a reason
  return points;
}

/**
 * The best voice for `lang` (e.g. "en-US"), or undefined to leave the choice to
 * the browser — when nothing speaks the language at all.
 */
export function pickNaturalVoice<T extends VoiceLike>(voices: readonly T[], lang = 'en-US'): T | undefined {
  let best: T | undefined;
  let bestScore = 0;
  for (const voice of voices) {
    const s = score(voice, lang);
    if (s > bestScore) {
      best = voice;
      bestScore = s;
    }
  }
  return best;
}
