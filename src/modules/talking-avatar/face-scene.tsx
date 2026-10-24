'use client';

/* eslint-disable react-hooks/immutability, react-hooks/purity, react-hooks/preserve-manual-memoization, react-hooks/exhaustive-deps --
   A react-three-fiber scene: uniforms and materials are created once and mutated every frame
   in useFrame, which is how r3f animates without re-rendering React. The React Compiler rules
   assume immutable render data and don't apply here. Ported verbatim from ScienceWerx. */

/**
 * A holographic talking face — shared by Lucy (/join) and Einstein (portal).
 *
 * A portrait lifted into 3D with MediaPipe's face mesh (see
 * scripts/hologram/build-face-hologram.mjs) is drawn as tens of thousands of
 * glowing points whose brightness comes from the photo, over a faint
 * wireframe of the mesh, inside halo rings, particles and a grid. Each
 * persona brings its asset, its colours per phase and its framing.
 *
 * Lip-sync: the jaw opens with the voice's level and the lips spread or round
 * with its spectrum (mouth-shape.ts). Expressions follow the phase: brows up
 * and a lean-in tilt while listening, brows knit and eyes narrowed while
 * thinking, nods on stressed syllables while speaking, a resting smile. The
 * eyes blink every few seconds, and a scan band sweeps the face. All motion is uniforms eased per frame from refs — React never
 * re-renders the scene for audio.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { AudioLevels } from './levels';
import { GRID_FRAGMENT, GRID_VERTEX, PARTICLE_FRAGMENT, PARTICLE_VERTEX, RING_FRAGMENT, RING_VERTEX } from './shaders';
import { faceFeatures, loadFace, meshSegments } from './face-asset';

export interface FaceSceneDrive {
  /** The persona's current phase, a key of its palettes. */
  phase: string;
  /** 0 → 1 on entry, 1 → 0 on exit. */
  power: number;
  /** Shrunk into a corner window (Einstein after opening a page). */
  docked?: boolean;
}

export interface FacePalette {
  color: string;
  accent: string;
  /** How busy the scan and rings look in this phase, 0..1. */
  agitation: number;
}

export interface FaceSceneConfig {
  /** Where the asset lives, e.g. "/lucy". */
  assetBase: string;
  palettes: Record<string, FacePalette>;
  /** Phase used before the first real one, and when a phase has no palette. */
  restPhase: string;
  /** The face's size and height on screen, full screen and docked. */
  framing: { scale: number; y: number; dockedScale: number; dockedY: number };
  /** Overall glow, 1 = as photographed. Bright subjects (white hair) need less under bloom. */
  brightness?: number;
}

/** Shared mouth motion, so points and wireframe open the jaw identically. */
const MOTION = /* glsl */ `
uniform float uTime;
uniform float uOpen;
uniform float uWide;
uniform float uRound;
uniform float uSmile;
uniform float uBrow;
uniform float uKnit;
uniform vec3 uMouthC;
uniform float uMouthW;
uniform vec3 uCornerL;
uniform vec3 uCornerR;
uniform vec3 uBrowL;
uniform vec3 uBrowR;
uniform vec3 uBrowIL;
uniform vec3 uBrowIR;
uniform float uBrowRad;
float bump(vec3 p, vec3 c, float r) {
  vec2 d = (p.xy - c.xy) / r;
  return exp(-dot(d, d));
}
vec3 lucyMotion(vec3 p, float jaw) {
  // Lips: spread for ee/s, round and push forward for oo/o (mouth-shape.ts).
  vec2 dm = (p.xy - uMouthC.xy) / vec2(uMouthW * 1.45, uMouthW * 0.85);
  float m = exp(-dot(dm, dm));
  p.x += (p.x - uMouthC.x) * (uWide * 0.16 - uRound * 0.24) * m;
  p.z += uRound * 0.03 * m;
  // Smile: the corners lift and draw outward.
  float cl = bump(p, uCornerL, uMouthW * 0.55);
  float cr = bump(p, uCornerR, uMouthW * 0.55);
  p.y += uSmile * 0.026 * (cl + cr);
  p.x += uSmile * 0.012 * (cr - cl) * sign(uCornerR.x - uCornerL.x);
  // Brows: raised when attentive, drawn down and together when thinking.
  p.y += uBrow * 0.038 * (bump(p, uBrowL, uBrowRad) + bump(p, uBrowR, uBrowRad));
  float il = bump(p, uBrowIL, uBrowRad * 0.8);
  float ir = bump(p, uBrowIR, uBrowRad * 0.8);
  p.y -= uKnit * 0.024 * (il + ir);
  p.x += uKnit * 0.011 * (il * sign(uMouthC.x - uBrowIL.x) + ir * sign(uMouthC.x - uBrowIR.x));
  // The jaw hinges down and slightly back; the lower lip travels with it.
  p.y -= uOpen * 0.042 * jaw;
  p.z -= uOpen * 0.008 * jaw;
  return p;
}
`;

const FACE_VERTEX = /* glsl */ `
${MOTION}
uniform float uPixelRatio;
uniform float uViewScale;
uniform float uListen;
uniform float uScan;
uniform float uBlink;
uniform vec2 uEyeY;
attribute float aLum;
attribute float aJaw;
attribute float aEye;
attribute float aSeed;
varying float vLum;
varying float vScan;
varying float vTwinkle;
void main() {
  vec3 p = lucyMotion(position, aJaw);
  // Blink: the eye region closes toward its centre line.
  if (aEye > 0.5) {
    float cy = aEye < 1.5 ? uEyeY.x : uEyeY.y;
    p.y = mix(p.y, cy, uBlink * 0.88);
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vLum = aLum;
  if (aEye > 0.5) vLum = mix(vLum, 1.0, uListen * 0.25) * (1.0 - uBlink * 0.6);
  vScan = smoothstep(0.045, 0.0, abs(p.y - uScan));
  vTwinkle = 0.8 + 0.2 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 50.0);
  gl_PointSize = uPixelRatio * uViewScale * (15.0 / -mv.z) * (0.85 + aLum * 0.7) * (1.0 + vScan * 0.6);
  gl_Position = projectionMatrix * mv;
}
`;

const FACE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uOpacity;
uniform float uBrightness;
varying float vLum;
varying float vScan;
varying float vTwinkle;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.08, d);
  // Brightness from the portrait: skin glows, eyes, brows and lips stay darker —
  // that contrast is what makes it read as a face.
  float l = pow(vLum, 0.85);
  vec3 col = mix(uColor, uAccent, clamp(l * 1.3 - 0.35 + vScan * 0.7, 0.0, 1.0));
  gl_FragColor = vec4(col, a * (0.06 + l * 1.05 + vScan * 0.5) * vTwinkle * uOpacity * uBrightness);
}
`;

const WIRE_VERTEX = /* glsl */ `
${MOTION}
attribute float aJaw;
uniform float uScan;
varying float vScan;
void main() {
  vec3 p = lucyMotion(position, aJaw);
  vScan = smoothstep(0.06, 0.0, abs(p.y - uScan));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const WIRE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uOpacity;
uniform float uLineFade;
varying float vScan;
void main() {
  gl_FragColor = vec4(mix(uColor, uAccent, vScan), (0.06 + vScan * 0.45) * uOpacity * uLineFade);
}
`;

const damp = THREE.MathUtils.damp;

function Hologram({
  getLevels,
  driveRef,
  config,
}: {
  getLevels: () => AudioLevels;
  driveRef: React.MutableRefObject<FaceSceneDrive>;
  config: FaceSceneConfig;
}) {
  const PALETTES = config.palettes;
  const rest = PALETTES[config.restPhase];
  const { gl } = useThree();
  const head = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Group>(null);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const state = useRef({
    color: new THREE.Color(rest.color),
    accent: new THREE.Color(rest.accent),
    open: 0,
    listen: 0,
    dock: 0,
    wide: 0,
    round: 0,
    brow: 0,
    knit: 0,
    smile: 0,
    tilt: 0,
    squint: 0,
    nod: 0,
    prevOut: 0,
    lastNod: 0,
    // Listening: how long the other person has been talking, and the
    // acknowledging nod when they pause.
    talk: 0,
    ack: 0,
    nextAck: 0,
    // Gaze, as small head turns: up-and-aside while thinking, micro-shifts otherwise.
    gazeX: 0,
    gazeY: 0,
    glanceX: 0,
    glanceSide: 1,
    nextGlance: 0,
    wasThinking: false,
    blink: 0,
    nextBlink: 2.5,
    agitation: 0,
    power: 0,
  });

  const [face, setFace] = useState<{
    pointsGeo: THREE.BufferGeometry;
    wireGeo: THREE.BufferGeometry;
    eyes: [number, number];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let built: { pointsGeo: THREE.BufferGeometry; wireGeo: THREE.BufferGeometry } | null = null;
    loadFace(config.assetBase)
      .then(({ points, mesh }) => {
        if (cancelled) return;
        const pointsGeo = new THREE.BufferGeometry();
        pointsGeo.setAttribute('position', new THREE.BufferAttribute(points.positions, 3));
        pointsGeo.setAttribute('aLum', new THREE.BufferAttribute(points.lum, 1));
        pointsGeo.setAttribute('aJaw', new THREE.BufferAttribute(points.jaw, 1));
        pointsGeo.setAttribute('aEye', new THREE.BufferAttribute(points.eye, 1));
        pointsGeo.setAttribute('aSeed', new THREE.BufferAttribute(points.seed, 1));
        const seg = meshSegments(mesh);
        const wireGeo = new THREE.BufferGeometry();
        wireGeo.setAttribute('position', new THREE.BufferAttribute(seg.positions, 3));
        wireGeo.setAttribute('aJaw', new THREE.BufferAttribute(seg.jaw, 1));
        built = { pointsGeo, wireGeo };
        const f = faceFeatures(mesh);
        const v = (p: [number, number, number]) => new THREE.Vector3(p[0], p[1], p[2]);
        shared.uMouthC.value.copy(v(f.mouth));
        shared.uMouthW.value = f.mouthHalfWidth;
        shared.uCornerL.value.copy(v(f.corners[0]));
        shared.uCornerR.value.copy(v(f.corners[1]));
        shared.uBrowL.value.copy(v(f.brows[0]));
        shared.uBrowR.value.copy(v(f.brows[1]));
        shared.uBrowIL.value.copy(v(f.innerBrows[0]));
        shared.uBrowIR.value.copy(v(f.innerBrows[1]));
        shared.uBrowRad.value = f.browRadius;
        setFace({ pointsGeo, wireGeo, eyes: mesh.eyes });
      })
      .catch((err) => console.error('[hologram] face asset failed to load:', err));
    return () => {
      cancelled = true;
      built?.pointsGeo.dispose();
      built?.wireGeo.dispose();
    };
  }, [config.assetBase]);

  const shared = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpen: { value: 0 },
      uScan: { value: 0 },
      uOpacity: { value: 0 },
      uWide: { value: 0 },
      uRound: { value: 0 },
      uSmile: { value: 0 },
      uBrow: { value: 0 },
      uKnit: { value: 0 },
      // Face landmarks, set when the asset loads (see faceFeatures).
      uMouthC: { value: new THREE.Vector3() },
      uMouthW: { value: 0.2 },
      uCornerL: { value: new THREE.Vector3() },
      uCornerR: { value: new THREE.Vector3() },
      uBrowL: { value: new THREE.Vector3(9, 9, 0) },
      uBrowR: { value: new THREE.Vector3(9, 9, 0) },
      uBrowIL: { value: new THREE.Vector3(9, 9, 0) },
      uBrowIR: { value: new THREE.Vector3(9, 9, 0) },
      uBrowRad: { value: 0.08 },
    }),
    [],
  );

  const pointsMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FACE_VERTEX,
        fragmentShader: FACE_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          ...shared,
          uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
          uViewScale: { value: 1 },
          uListen: { value: 0 },
          uBlink: { value: 0 },
          uBrightness: { value: 1 },
          uEyeY: { value: new THREE.Vector2() },
          uColor: { value: new THREE.Color() },
          uAccent: { value: new THREE.Color() },
        },
      }),
    [gl, shared],
  );

  const linesMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: WIRE_VERTEX,
        fragmentShader: WIRE_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { ...shared, uLineFade: { value: 1 }, uColor: { value: new THREE.Color() }, uAccent: { value: new THREE.Color() } },
      }),
    [shared],
  );

  const rings = useMemo(
    () =>
      [
        { inner: 1.55, outer: 1.58, segments: 120, duty: 0.55, speed: 0.06, y: -1.05, tilt: 0.12 },
        { inner: 1.75, outer: 1.8, segments: 8, duty: 0.75, speed: -0.025, y: -1.1, tilt: 0.08 },
        { inner: 2.05, outer: 2.07, segments: 200, duty: 0.3, speed: 0.015, y: -1.15, tilt: 0.05 },
      ].map((r) => ({
        ...r,
        geometry: new THREE.RingGeometry(r.inner, r.outer, 256, 1),
        material: new THREE.ShaderMaterial({
          vertexShader: RING_VERTEX,
          fragmentShader: RING_FRAGMENT,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color() },
            uSegments: { value: r.segments },
            uDuty: { value: r.duty },
            uSpeed: { value: r.speed },
            uOpacity: { value: 0 },
            uEnergy: { value: 0 },
            uInner: { value: r.inner },
            uOuter: { value: r.outer },
          },
        }),
      })),
    [],
  );

  const particles = useMemo(() => {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 2.3 + Math.pow(Math.random(), 1.4) * 3.4;
      const t = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(t) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
      positions[i * 3 + 2] = Math.sin(t) * r - 1.2;
      seeds[i] = Math.random();
      sizes[i] = 0.5 + Math.random() * 1.4;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
        uColor: { value: new THREE.Color() },
        uOpacity: { value: 0 },
      },
    });
    return { geometry, material };
  }, [gl]);

  const gridMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GRID_VERTEX,
        fragmentShader: GRID_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uOpacity: { value: 0 } },
      }),
    [],
  );

  useEffect(
    () => () => {
      pointsMat.dispose();
      linesMat.dispose();
      particles.geometry.dispose();
      particles.material.dispose();
      gridMat.dispose();
      rings.forEach((r) => {
        r.geometry.dispose();
        r.material.dispose();
      });
    },
    [pointsMat, linesMat, particles, gridMat, rings],
  );

  const targetColor = useMemo(() => new THREE.Color(), []);
  const targetAccent = useMemo(() => new THREE.Color(), []);

  useFrame((frame, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = frame.clock.elapsedTime;
    const drive = driveRef.current;
    const palette = PALETTES[drive.phase] ?? rest;
    const s = state.current;
    const { out, mic, shape } = getLevels();

    const k = 1 - Math.exp(-4 * dt);
    s.color.lerp(targetColor.set(palette.color), k);
    s.accent.lerp(targetAccent.set(palette.accent), k);
    // Syllable flutter over the voice envelope, so the mouth doesn't just hold open.
    const speech = Math.min(1, out * 1.5) * (0.7 + 0.3 * Math.sin(t * 23) * Math.sin(t * 7.3));
    // A sharp drop (a stop consonant, a gap between words) closes the lips fast.
    const drop = s.prevOut - out;
    s.open = damp(s.open, speech, speech > s.open ? 22 : drop > 0.06 ? 30 : 10, dt);
    const listening = drive.phase === 'listening' ? 0.4 + Math.min(1, mic * 2) * 0.6 : 0;
    s.listen = damp(s.listen, listening, 4, dt);
    s.agitation = damp(s.agitation, palette.agitation, 3, dt);

    // Expressions. Mouth shape follows the voice; the rest follows the phase.
    const speaking = drive.phase === 'speaking' || out > 0.08;
    const thinking = drive.phase === 'thinking' || drive.phase === 'acting' || drive.phase === 'booting';
    const attentive = drive.phase === 'listening';
    s.wide = damp(s.wide, speaking ? shape?.wide ?? 0 : 0, 14, dt);
    s.round = damp(s.round, speaking ? shape?.round ?? 0 : 0, 14, dt);
    // A stressed syllable — a sharp rise in level — lifts the brows and nods the head.
    const onset = Math.max(0, out - s.prevOut);
    s.prevOut = out;
    if (onset > 0.12 && t - s.lastNod > 0.35) {
      s.nod = Math.min(1, s.nod + onset * 2.2);
      s.lastNod = t;
    }
    s.nod = damp(s.nod, 0, 5, dt);

    // Active listening: while they talk, an occasional small nod; when they
    // pause after a real phrase, a clear acknowledging nod and a warmer face.
    const talking = attentive && mic > 0.08;
    if (talking) {
      s.talk += dt;
      if (s.talk > 2.2 && t > s.nextAck) {
        s.ack = Math.max(s.ack, 0.45);
        s.nextAck = t + 2.4 + Math.random() * 1.6;
      }
    } else if (attentive && mic < 0.04 && s.talk > 0.7) {
      s.ack = 1;
      s.talk = 0;
      s.nextAck = t + 1.5;
    } else if (!attentive) {
      s.talk = 0;
    }
    s.ack = damp(s.ack, 0, 3.2, dt);

    // Thinking: eyes drift up and to one side, as people do when recalling.
    if (thinking && !s.wasThinking) s.glanceSide = Math.random() < 0.5 ? -1 : 1;
    s.wasThinking = thinking;
    if (!thinking && t > s.nextGlance) {
      s.glanceX = (Math.random() - 0.5) * (attentive ? 0.03 : 0.06);
      s.nextGlance = t + 1.2 + Math.random() * 2.6;
    }
    s.gazeX = damp(s.gazeX, thinking ? 0.13 * s.glanceSide : s.glanceX, thinking ? 1.6 : 6, dt);
    s.gazeY = damp(s.gazeY, thinking ? -0.07 : 0, 1.8, dt);
    const browTarget = attentive ? 0.45 + Math.min(1, mic * 2) * 0.35 + s.ack * 0.15 : speaking ? 0.15 + s.nod * 0.6 : 0;
    s.brow = damp(s.brow, browTarget, 4, dt);
    s.knit = damp(s.knit, thinking ? (drive.phase === 'acting' ? 0.55 : 0.85) : drive.phase === 'error' ? 0.6 : 0, 3, dt);
    s.smile = damp(s.smile, (attentive ? 0.35 : speaking ? 0.18 : drive.phase === 'done' ? 0.6 : 0.1) + s.ack * 0.25, 2.5, dt);
    s.tilt = damp(s.tilt, attentive ? 0.06 + Math.min(1, mic * 2) * 0.03 : thinking ? -0.03 : 0, 2, dt);
    // Thinking narrows the eyes a little.
    s.squint = damp(s.squint, thinking ? 0.22 : 0, 3, dt);
    shared.uWide.value = s.wide;
    shared.uRound.value = s.round;
    shared.uBrow.value = s.brow;
    shared.uKnit.value = s.knit;
    shared.uSmile.value = s.smile;
    s.power = damp(s.power, drive.power, drive.power > s.power ? 1.8 : 5, dt);

    shared.uTime.value = t;
    shared.uOpen.value = s.open;
    shared.uOpacity.value = s.power;
    // The scan band sweeps down the face, faster while she is thinking.
    shared.uScan.value = 1.2 - ((t * (0.35 + s.agitation * 0.6)) % 2.6);

    // A natural blink every few seconds: ~0.2 s close-and-open.
    if (t > s.nextBlink) {
      const phase = (t - s.nextBlink) / 0.2;
      s.blink = phase < 1 ? Math.sin(phase * Math.PI) : 0;
      if (phase >= 1) s.nextBlink = t + 2.8 + Math.random() * 3.5;
    }
    pointsMat.uniforms.uListen.value = s.listen;
    pointsMat.uniforms.uBlink.value = Math.max(s.blink, s.squint);
    // Docked, the face is small and the bloom piles up — pull the glow back further.
    pointsMat.uniforms.uBrightness.value = (config.brightness ?? 1) * (1 - s.dock * 0.35);
    if (face) pointsMat.uniforms.uEyeY.value.set(face.eyes[0], face.eyes[1]);
    pointsMat.uniforms.uColor.value.copy(s.color);
    pointsMat.uniforms.uAccent.value.copy(s.accent);
    linesMat.uniforms.uColor.value.copy(s.color);
    linesMat.uniforms.uAccent.value.copy(s.accent);

    if (head.current) {
      // A slow, living sway — never still, never distracting.
      // A slow, living sway; a lean-in tilt while listening; nods on stressed syllables.
      head.current.rotation.y = Math.sin(t * 0.23) * 0.1 + frame.pointer.x * 0.08 + s.gazeX;
      // The acknowledging nod is a down-and-back dip, not a held tilt.
      const ackDip = s.ack * Math.sin(Math.min(1, (1 - s.ack) * 2.2) * Math.PI) * 0.09 + s.ack * 0.03;
      head.current.rotation.x = Math.sin(t * 0.17) * 0.03 - frame.pointer.y * 0.05 - s.open * 0.02 + s.nod * 0.07 + ackDip + s.gazeY;
      head.current.rotation.z = s.tilt;
      const f = config.framing;
      s.dock = damp(s.dock, drive.docked ? 1 : 0, 4, dt);
      head.current.position.y = THREE.MathUtils.lerp(f.y, f.dockedY, s.dock) + Math.sin(t * 0.6) * 0.02;
      const headScale = THREE.MathUtils.lerp(f.scale, f.dockedScale, s.dock);
      head.current.scale.setScalar(headScale * (0.92 + 0.08 * s.power));
      // Points are sized in screen pixels, so a small canvas (the docked
      // window is 190 px tall) packed the same thousands of them into a tiny
      // area and the additive glow saturated to a white blob. Shrink points
      // and wire lines with the face's on-screen size; full screen (≥ ~900 px)
      // is unchanged.
      const view = Math.min(1, (frame.size.height * headScale) / (900 * f.scale));
      pointsMat.uniforms.uViewScale.value = Math.max(0.2, view);
      linesMat.uniforms.uLineFade.value = Math.max(0.15, view);
      // The background dust is pixel-sized too; same scale, via its pixel ratio.
      particles.material.uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2) * Math.max(0.35, view);
    }

    rings.forEach((r, i) => {
      const u = r.material.uniforms;
      u.uTime.value = t * (0.6 + s.agitation);
      u.uColor.value.copy(i % 2 ? s.accent : s.color);
      u.uEnergy.value = s.open;
      u.uOpacity.value = (0.55 - i * 0.12) * THREE.MathUtils.clamp(s.power * 1.5 - i * 0.15, 0, 1) * (1 - s.dock);
    });
    if (halo.current) halo.current.rotation.y += dt * (0.08 + s.agitation * 0.25);

    const pu = particles.material.uniforms;
    pu.uTime.value = t;
    pu.uEnergy.value = s.open;
    pu.uColor.value.copy(s.color);
    pu.uOpacity.value = s.power * 0.6;

    gridMat.uniforms.uTime.value = t;
    gridMat.uniforms.uColor.value.copy(s.color);
    gridMat.uniforms.uOpacity.value = s.power * 0.7 * (1 - s.dock);

    camTarget.set(frame.pointer.x * 0.25, 0.2 + frame.pointer.y * 0.15, 5.3);
    frame.camera.position.lerp(camTarget, 1 - Math.exp(-2 * dt));
    frame.camera.lookAt(0, 0.1, 0);
  });

  return (
    <>
      <group ref={head}>
        {face && (
          <>
            <points geometry={face.pointsGeo} material={pointsMat} />
            <lineSegments geometry={face.wireGeo} material={linesMat} />
          </>
        )}
      </group>
      <group ref={halo}>
        {rings.map((r, i) => (
          <mesh key={i} geometry={r.geometry} material={r.material} position={[0, r.y, 0]} rotation={[-Math.PI / 2 + r.tilt, 0, 0]} />
        ))}
      </group>
      <points geometry={particles.geometry} material={particles.material} />
      <mesh material={gridMat} position={[0, -2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
      </mesh>
    </>
  );
}

export default function FaceScene({
  getLevels,
  driveRef,
  paused,
  config,
}: {
  getLevels: () => AudioLevels;
  driveRef: React.MutableRefObject<FaceSceneDrive>;
  config: FaceSceneConfig;
  paused: boolean;
}) {
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  return (
    <Canvas
      dpr={quality === 'high' ? [1, 1.75] : [0.75, 1]}
      frameloop={paused ? 'never' : 'always'}
      camera={{ position: [0, 0.2, 5.3], fov: 40, near: 0.1, far: 100 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance', stencil: false }}
      // No tone mapping — see the Jarvis scene: ACES greys out additive glow.
      flat
      style={{ position: 'absolute', inset: 0 }}
    >
      <PerformanceMonitor onDecline={() => setQuality('low')} onIncline={() => setQuality('high')} flipflops={3} onFallback={() => setQuality('low')}>
        <Hologram getLevels={getLevels} driveRef={driveRef} config={config} />
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={quality === 'high' ? 1.25 : 0.8} luminanceThreshold={0.1} luminanceSmoothing={0.3} radius={0.7} />
          <Vignette eskil={false} offset={0.25} darkness={0.7} />
        </EffectComposer>
      </PerformanceMonitor>
    </Canvas>
  );
}
