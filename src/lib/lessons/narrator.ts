/**
 * Who reads the slides aloud: a recorded Gemini voice, shown as ScienceWerx's
 * holographic Einstein (modules/talking-avatar). Shared by server and client:
 * the player fingerprints each slide's words with this voice, and the narration
 * route refuses a request whose fingerprint isn't the one it would record — so
 * a clip URL names exactly one recording and can be cached forever.
 */

import { narrationFingerprint } from '@/lib/narration/narration';

export const NARRATOR = {
  name: 'Einstein',
  /** A Gemini prebuilt voice (lib/narration/server/tts.ts): knowledgeable, male, to suit the face. */
  voice: 'Sadaltager',
} as const;

/** Longer than this and a slide is read by the browser voice instead (a Firestore clip stays under 1 MB). */
export const NARRATION_MAX_CHARS = 1_200;

export function slideClipHash(speech: string): string {
  return narrationFingerprint(speech, NARRATOR.voice);
}

export function slideClipUrl(courseId: string, lessonId: string, slide: number, speech: string): string {
  const q = new URLSearchParams({ courseId, lessonId, slide: String(slide), h: slideClipHash(speech) });
  return `/api/course/narration?${q}`;
}
