/**
 * A holographic face asset, as built by scripts/hologram/build-face-hologram.mjs
 * from a portrait and MediaPipe's 3D face mesh — Lucy at /lucy, Einstein at
 * /einstein.
 *
 *   {base}/face-points.bin — N × 10 bytes: x,y,z (uint16 over ±range), lum, jaw, eye, seed (uint8)
 *   {base}/face-mesh.json  — landmarks [x,y,z,jaw] and wireframe edges
 *
 * Pure decoding, no three.js, so it is unit-testable.
 */

const STRIDE = 10;

export interface FaceMesh {
  version: number;
  count: number;
  range: number;
  /** y of the left and right eye centres, for blinking. */
  eyes: [number, number];
  /** [x, y, z, jawWeight] per MediaPipe landmark. */
  landmarks: [number, number, number, number][];
  edges: [number, number][];
}

export interface FacePoints {
  positions: Float32Array;
  lum: Float32Array;
  jaw: Float32Array;
  /** 0 = not an eye, 1 = left eye, 2 = right eye. */
  eye: Float32Array;
  seed: Float32Array;
  count: number;
}

export function decodeFacePoints(buffer: ArrayBuffer, range: number): FacePoints {
  const view = new DataView(buffer);
  const count = Math.floor(buffer.byteLength / STRIDE);
  const positions = new Float32Array(count * 3);
  const lum = new Float32Array(count);
  const jaw = new Float32Array(count);
  const eye = new Float32Array(count);
  const seed = new Float32Array(count);
  const unq = (v: number) => (v / 65535) * 2 * range - range;
  for (let i = 0; i < count; i++) {
    const o = i * STRIDE;
    positions[i * 3] = unq(view.getUint16(o, true));
    positions[i * 3 + 1] = unq(view.getUint16(o + 2, true));
    positions[i * 3 + 2] = unq(view.getUint16(o + 4, true));
    lum[i] = view.getUint8(o + 6) / 255;
    jaw[i] = view.getUint8(o + 7) / 255;
    eye[i] = view.getUint8(o + 8);
    seed[i] = view.getUint8(o + 9) / 255;
  }
  return { positions, lum, jaw, eye, seed, count };
}

/** Wireframe segments from the mesh edges, with each vertex's jaw weight so lines move with the mouth. */
export function meshSegments(mesh: FaceMesh): { positions: Float32Array; jaw: Float32Array } {
  const positions = new Float32Array(mesh.edges.length * 6);
  const jaw = new Float32Array(mesh.edges.length * 2);
  mesh.edges.forEach(([a, b], i) => {
    const A = mesh.landmarks[a];
    const B = mesh.landmarks[b];
    positions.set([A[0], A[1], A[2], B[0], B[1], B[2]], i * 6);
    jaw[i * 2] = A[3];
    jaw[i * 2 + 1] = B[3];
  });
  return { positions, jaw };
}

export async function loadFace(base: string): Promise<{ points: FacePoints; mesh: FaceMesh }> {
  const [meshRes, binRes] = await Promise.all([fetch(`${base}/face-mesh.json`), fetch(`${base}/face-points.bin`)]);
  if (!meshRes.ok || !binRes.ok) throw new Error(`Face asset missing at ${base}.`);
  const mesh = (await meshRes.json()) as FaceMesh;
  const points = decodeFacePoints(await binRes.arrayBuffer(), mesh.range);
  return { points, mesh };
}

export interface FaceFeatures {
  /** Centre of the mouth (between the inner lips). */
  mouth: [number, number, number];
  mouthHalfWidth: number;
  /** Mouth corners, subject's right then left. */
  corners: [[number, number, number], [number, number, number]];
  /** Mid-brow points, for raising. */
  brows: [[number, number, number], [number, number, number]];
  /** Inner brow ends, for knitting. */
  innerBrows: [[number, number, number], [number, number, number]];
  browRadius: number;
}

/**
 * Where the expressive parts of the face are, from MediaPipe landmark indices:
 * 13/14 inner lips, 61/291 mouth corners, 105/334 mid-brows, 107/336 inner brows.
 */
export function faceFeatures(mesh: FaceMesh): FaceFeatures {
  const p = (i: number): [number, number, number] => {
    const l = mesh.landmarks[i];
    return [l[0], l[1], l[2]];
  };
  const mid = (a: number, b: number): [number, number, number] => {
    const A = p(a);
    const B = p(b);
    return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
  };
  const left = p(61);
  const right = p(291);
  const mouthHalfWidth = Math.hypot(right[0] - left[0], right[1] - left[1]) / 2;
  return {
    mouth: mid(13, 14),
    mouthHalfWidth,
    corners: [left, right],
    brows: [p(105), p(334)],
    innerBrows: [p(107), p(336)],
    browRadius: mouthHalfWidth * 0.55,
  };
}
