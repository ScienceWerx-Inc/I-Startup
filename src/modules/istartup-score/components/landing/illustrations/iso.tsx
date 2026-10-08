/**
 * A tiny isometric drawing kit shared by every landing illustration, so they all use one
 * projection, one light direction and one shading recipe:
 *
 *   x runs right-down, y runs left-down, z runs up (true isometric, 30°).
 *   Light comes from the upper left: top faces are the base colour, left faces are
 *   shaded a little toward navy, right faces a little more.
 *
 * Colours are CSS colour strings (usually tokens such as `var(--fund)`); shading is done
 * with color-mix so a palette change re-shades every illustration.
 */

const COS30 = Math.cos(Math.PI / 6);

/** Rounded so server and client render identical attribute strings. */
const r2 = (n: number) => Math.round(n * 100) / 100;

export type P3 = [number, number, number];

export const iso = ([x, y, z]: P3): [number, number] => [r2((x - y) * COS30), r2((x + y) * 0.5 - z)];

export const pts = (...ps: P3[]) => ps.map((p) => iso(p).join(',')).join(' ');

/** Mix a colour toward navy (shade) or white (tint). */
export const shade = (color: string, pct: number) => `color-mix(in oklab, ${color}, var(--carbon) ${pct}%)`;
export const tint = (color: string, pct: number) => `color-mix(in oklab, ${color}, #fff ${pct}%)`;

/**
 * SVG matrix that maps flat 2D content onto the top face of the iso grid, so text or
 * shapes drawn at (u, v) land on the ground plane at x = u, y = v.
 */
export const topPlaneMatrix = (z = 0) => `matrix(${r2(COS30)} 0.5 ${r2(-COS30)} 0.5 0 ${-z})`;

type BoxProps = {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  color: string;
  /** Override the default shading (percent toward navy) of the left / right faces. */
  shadeLeft?: number;
  shadeRight?: number;
  /** Colour of the top face, if different from the sides' base. */
  top?: string;
  /** Hairline along the top edges, for crispness on light grounds. */
  edge?: string;
};

/** A rectangular prism. Draw boxes back-to-front (smaller x + y first). */
export function Box({ x, y, z = 0, w, d, h, color, shadeLeft = 14, shadeRight = 30, top, edge }: BoxProps) {
  const t = z + h;
  return (
    <g>
      <polygon points={pts([x, y + d, z], [x + w, y + d, z], [x + w, y + d, t], [x, y + d, t])} style={{ fill: shade(color, shadeLeft) }} />
      <polygon points={pts([x + w, y, z], [x + w, y + d, z], [x + w, y + d, t], [x + w, y, t])} style={{ fill: shade(color, shadeRight) }} />
      <polygon points={pts([x, y, t], [x + w, y, t], [x + w, y + d, t], [x, y + d, t])} style={{ fill: top ?? color }} />
      {edge && (
        <polyline
          points={pts([x, y + d, t], [x + w, y + d, t], [x + w, y, t])}
          fill="none"
          stroke={edge}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

/** A soft contact shadow under an object footprint. */
export function Shadow({ x, y, w, d, z = 0, opacity = 0.08 }: { x: number; y: number; w: number; d: number; z?: number; opacity?: number }) {
  return (
    <polygon
      points={pts([x + 4, y + 6, z], [x + w + 10, y + 6, z], [x + w + 10, y + d + 10, z], [x + 4, y + d + 10, z])}
      style={{ fill: 'var(--carbon)', fillOpacity: opacity }}
    />
  );
}

type CoinStackProps = {
  x: number;
  y: number;
  z?: number;
  count: number;
  r?: number;
  /** Thickness of one coin. */
  t?: number;
  color: string;
};

/** A stack of coins standing on the ground plane, centred on (x, y). */
export function CoinStack({ x, y, z = 0, count, r = 14, t = 5, color }: CoinStackProps) {
  const [cx, cy] = iso([x, y, z]);
  const rx = r2(r * 1.22);
  const ry = r2(r * 0.71);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const base = cy - i * t;
        const top = base - t + 1;
        return (
          <g key={i}>
            <path
              d={`M${cx - rx} ${top} L${cx - rx} ${base} A${rx} ${ry} 0 0 0 ${cx + rx} ${base} L${cx + rx} ${top} Z`}
              style={{ fill: shade(color, 26) }}
            />
            <ellipse cx={cx} cy={top} rx={rx} ry={ry} style={{ fill: color }} />
            {i === count - 1 && (
              <ellipse cx={cx} cy={top} rx={r2(rx * 0.62)} ry={r2(ry * 0.62)} fill="none" style={{ stroke: shade(color, 22) }} strokeWidth="1.25" />
            )}
          </g>
        );
      })}
    </g>
  );
}

/** A small pennant on a pole, planted at (x, y, z). */
export function Flag({ x, y, z = 0, height = 46, color }: { x: number; y: number; z?: number; height?: number; color: string }) {
  const [px, py] = iso([x, y, z]);
  const topY = py - height;
  return (
    <g>
      <ellipse cx={px} cy={py} rx="5" ry="2.6" style={{ fill: 'var(--carbon)', fillOpacity: 0.18 }} />
      <line x1={px} y1={py} x2={px} y2={topY} stroke="var(--carbon)" strokeWidth="2" strokeLinecap="round" />
      <path d={`M${px} ${topY} L${px + 22} ${topY + 6} L${px} ${topY + 14} Z`} style={{ fill: color }} />
    </g>
  );
}

/**
 * SVG matrix that maps flat 2D content onto a vertical face facing left-down (a plane of
 * constant y), with u running along x and v running up from (x0, y0, z0).
 */
export const leftPlaneMatrix = (x0: number, y0: number, z0: number) => {
  const [tx, ty] = iso([x0, y0, z0]);
  return `matrix(${r2(COS30)} 0.5 0 -1 ${tx} ${ty})`;
};
