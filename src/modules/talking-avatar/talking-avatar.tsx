'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

import type { FaceSceneConfig, FaceSceneDrive } from './face-scene';
import type { VoiceSource } from './levels';
import { SILENT } from './levels';

/**
 * A talking holographic face in a small dark window, for narrating content.
 *
 * three.js and the post-processing stack are a large download, so the scene is
 * a separate chunk loaded only when an avatar is first shown — a page that
 * never narrates never pays for it. The voice is read per frame from `voice`
 * (levels.ts); `phase` picks the expression (personas.ts).
 */

const FaceScene = dynamic(() => import('./face-scene'), { ssr: false });

interface Props {
  persona: FaceSceneConfig;
  /** What is speaking, or null for a resting face. */
  voice: VoiceSource | null;
  phase: string;
  /** Freezes the scene (hidden tab, reduced motion) without unmounting it. */
  paused?: boolean;
  className?: string;
  label?: string;
}

export function TalkingAvatar({ persona, voice, phase, paused = false, className, label = 'Narrator' }: Props) {
  const driveRef = useRef<FaceSceneDrive>({ phase, power: 0, docked: true });
  const voiceRef = useRef(voice);

  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

  useEffect(() => {
    driveRef.current.phase = phase;
  }, [phase]);

  // Fade in on mount; the scene eases power itself.
  useEffect(() => {
    driveRef.current.power = 1;
  }, []);

  return (
    <div role="img" aria-label={label} className={className} style={{ position: 'relative', overflow: 'hidden', background: '#020617' }}>
      <FaceScene
        getLevels={() => voiceRef.current?.levels() ?? SILENT}
        driveRef={driveRef}
        paused={paused}
        config={persona}
      />
    </div>
  );
}
