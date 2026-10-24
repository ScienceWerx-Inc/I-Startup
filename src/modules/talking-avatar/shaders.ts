/**
 * GLSL for the hologram surroundings — halo rings, drifting particles and the
 * grid floor — shared by Einstein's and Lucy's face scenes
 * (src/components/hologram/face-scene.tsx). Plain strings, so they live in
 * the lazily loaded overlay chunks.
 */

/** Segmented holographic ring: dashes, ticks and a travelling highlight, all from the angle. */
export const RING_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vPos;
void main() {
  vUv = uv;
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const RING_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uSegments;
uniform float uDuty;
uniform float uSpeed;
uniform float uOpacity;
uniform float uEnergy;
uniform float uInner;
uniform float uOuter;
varying vec2 vUv;
varying vec3 vPos;
#define TAU 6.28318530718
void main() {
  float a = atan(vPos.y, vPos.x) / TAU + 0.5;
  float seg = fract(a * uSegments + uTime * uSpeed);
  float dash = step(seg, uDuty);
  // A bright sweep travelling round the ring.
  float sweep = pow(fract(a - uTime * 0.12 * sign(uSpeed + 0.0001)), 14.0) * 1.4;
  // Soften the inner/outer edges of the band.
  float r = (length(vPos.xy) - uInner) / max(uOuter - uInner, 0.0001);
  float edge = smoothstep(0.0, 0.3, r) * smoothstep(1.0, 0.7, r);
  float alpha = (dash * (0.55 + uEnergy * 0.6) + sweep) * edge * uOpacity;
  gl_FragColor = vec4(uColor * (1.0 + sweep), alpha);
}
`;

/** Particle field orbiting the core; each point drifts on its own phase. */
export const PARTICLE_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uEnergy;
uniform float uPixelRatio;
attribute float aSeed;
attribute float aSize;
varying float vAlpha;
void main() {
  vec3 p = position;
  float t = uTime * (0.05 + aSeed * 0.08);
  float c = cos(t), s = sin(t);
  p.xz = mat2(c, -s, s, c) * p.xz;
  p *= 1.0 + uEnergy * 0.18 * sin(uTime * 3.0 + aSeed * 30.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (17.0 / -mv.z);
  vAlpha = 0.25 + 0.75 * fract(aSeed * 13.7 + uTime * 0.15);
}
`;

export const PARTICLE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
}
`;

/** Receding perspective grid with a scan line sweeping toward the viewer. */
export const GRID_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const GRID_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec2 g = vUv * 40.0;
  vec2 grid = abs(fract(g - 0.5) - 0.5) / fwidth(g);
  float line = 1.0 - min(min(grid.x, grid.y), 1.0);
  float fade = smoothstep(1.0, 0.25, length(vUv - 0.5) * 2.0);
  float scan = smoothstep(0.03, 0.0, abs(fract(vUv.y - uTime * 0.08) - 0.5)) * 0.8;
  gl_FragColor = vec4(uColor, (line * 0.22 + scan * 0.25) * fade * uOpacity);
}
`;
