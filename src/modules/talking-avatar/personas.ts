import type { FaceSceneConfig } from './face-scene';

/**
 * Ready-made faces. Each asset (face-points.bin + face-mesh.json, built from a
 * portrait with MediaPipe's face mesh) ships in this brick's `assets/` and must
 * be served from `assetBase` — copy `assets/<name>` to `public/avatars/<name>`.
 *
 * Phases a narrator uses: `idle` (resting), `thinking` (fetching its next
 * line — brows knit, eyes drift up), `speaking` (the mouth follows the voice).
 * Any other phase falls back to `idle`'s palette.
 */

export type NarratorPhase = 'idle' | 'thinking' | 'speaking';

/** Einstein, from Orren Jack Turner's public-domain 1947 portrait, in ScienceWerx's cyan. */
export function einsteinPersona(assetBase = '/avatars/einstein'): FaceSceneConfig {
  return {
    assetBase,
    restPhase: 'idle',
    palettes: {
      idle: { color: '#0ea5e9', accent: '#bae6fd', agitation: 0.05 },
      thinking: { color: '#6366f1', accent: '#c7d2fe', agitation: 0.65 },
      speaking: { color: '#38bdf8', accent: '#f0f9ff', agitation: 0.15 },
    },
    // His hair is wide; these fill a small window, which is how a narrator is shown.
    framing: { scale: 0.6, y: 0.72, dockedScale: 1.0, dockedY: 0.05 },
    // His white hair photographs near full brightness; under bloom it would wash out.
    brightness: 0.62,
  };
}

/** Edison, ScienceWerx's interviewer, in amber. */
export function edisonPersona(assetBase = '/avatars/edison'): FaceSceneConfig {
  return {
    assetBase,
    restPhase: 'idle',
    palettes: {
      idle: { color: '#f59e0b', accent: '#fef3c7', agitation: 0.05 },
      thinking: { color: '#ea580c', accent: '#fed7aa', agitation: 0.8 },
      speaking: { color: '#fbbf24', accent: '#fffbeb', agitation: 0.15 },
    },
    framing: { scale: 0.62, y: 0.74, dockedScale: 1.0, dockedY: 0.05 },
    brightness: 0.7,
  };
}
