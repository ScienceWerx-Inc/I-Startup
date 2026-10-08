'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

import { Box, CoinStack, Flag, Shadow, iso, leftPlaneMatrix, pts, tint, topPlaneMatrix } from './iso';

/**
 * The landing page's illustration set: hand-built isometric scenes about startups and
 * funding, in the page's own palette. Pure SVG; idle motion is slow and small, and is
 * dropped under reduced motion by the page's MotionConfig.
 */

const COIN = 'var(--dim-motivation)';
const float = (distance: number, duration: number, delay = 0) => ({
  animate: { y: [0, -distance, 0] },
  transition: { duration, repeat: Infinity, ease: 'easeInOut' as const, delay },
});

type SceneProps = { className?: string };

function Svg({ viewBox, label, className, children }: { viewBox: string; label: string; className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox={viewBox} role="img" aria-label={label} className={cn('block h-auto w-full', className)}>
      {children}
    </svg>
  );
}

/** A white plinth every scene stands on. */
function Plinth({ w, d, h = 12, color = 'var(--surface)' }: { w: number; d: number; h?: number; color?: string }) {
  return <Box x={0} y={0} w={w} d={d} h={h} color={color} shadeLeft={7} shadeRight={15} />;
}

/* ─────────────────────────────── Hero ─────────────────────────────── */

const STEPS = [
  'var(--dim-management)',
  'var(--dim-momentum)',
  'var(--dim-business-model)',
  'var(--dim-market)',
  'var(--dim-motivation)',
];

/** Five steps — one per scored dimension — climbing away to a flag, with capital at the foot. */
export function ReadinessClimb({ className }: SceneProps) {
  const P = 12; // plinth height
  const stepD = 34;
  const last = STEPS.length - 1;
  // Steps run back along -y so each taller step sits behind the last and every top stays visible.
  const stepY = (i: number) => 150 - (i + 1) * (stepD + 2);
  const stepH = (i: number) => 24 + i * 22;

  return (
    <Svg viewBox="-179 -158 374 372" label="Illustration: five steps, one per scored dimension, rising to a flag, with stacks of coins at the foot." className={className}>
      <Plinth w={210} d={190} h={P} />
      <Shadow x={40} y={stepY(last)} w={74} d={150 - stepY(last)} z={P} />

      {[...STEPS.keys()].reverse().map((i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.09 }}
        >
          <Box x={40} y={stepY(i)} z={P} w={74} d={stepD} h={stepH(i)} color={STEPS[i]} />
        </motion.g>
      ))}

      <motion.g initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.85 }}>
        <Flag x={77} y={stepY(last) + stepD / 2} z={P + stepH(last)} height={50} color="var(--fund)" />
      </motion.g>

      {/* Capital at the foot of the climb. */}
      <CoinStack x={160} y={120} z={P} count={7} color={COIN} />
      <CoinStack x={182} y={150} z={P} count={4} color={COIN} />
      <CoinStack x={150} y={162} z={P} count={2} color={COIN} />

      {/* A floating "verified" tile. */}
      <motion.g {...float(6, 5)}>
        <polygon points={pts([-10, 174, 96], [34, 174, 96], [34, 174, 90], [-10, 174, 90])} style={{ fill: "var(--line)" }} />
        <polygon points={pts([34, 130, 96], [34, 174, 96], [34, 174, 90], [34, 130, 90])} style={{ fill: "var(--line-strong)" }} />
        <g transform={topPlaneMatrix(96)}>
          <rect x="-10" y="130" width="44" height="44" rx="8" style={{ fill: "var(--surface)" }} />
          <path d="M2 153 L10 161 L24 144" fill="none" stroke="var(--fund)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </motion.g>
    </Svg>
  );
}

/* ───────────────────────────── Benefits ───────────────────────────── */

/** Non-dilutive capital: a grant certificate standing beside stacks of coins. */
export function GrantCapital({ className }: SceneProps) {
  const P = 10;
  return (
    <Svg viewBox="-135 -108 305 283" label="Illustration: a grant certificate with a seal beside stacks of coins." className={className}>
      <Plinth w={180} d={140} h={P} />

      {/* Certificate, standing on its long edge. */}
      <Shadow x={18} y={24} w={84} d={8} z={P} opacity={0.1} />
      <Box x={18} y={24} z={P} w={84} d={6} h={104} color="var(--surface)" shadeLeft={4} shadeRight={18} />
      <g transform={leftPlaneMatrix(18, 30, P)}>
        <rect x="10" y="14" width="64" height="78" rx="2" fill="none" stroke="var(--line-strong)" strokeWidth="1.25" />
        <rect x="18" y="76" width="40" height="5" rx="2.5" style={{ fill: 'var(--carbon)' }} />
        <rect x="18" y="66" width="48" height="3" rx="1.5" style={{ fill: 'var(--line-strong)' }} />
        <rect x="18" y="59" width="36" height="3" rx="1.5" style={{ fill: 'var(--line-strong)' }} />
        <circle cx="54" cy="32" r="11" style={{ fill: 'var(--fund)' }} />
        <path d="M48.5 33 L52.5 29 L60 36.5" fill="none" stroke="var(--surface)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <CoinStack x={128} y={46} z={P} count={6} color={COIN} />
      <CoinStack x={150} y={78} z={P} count={10} color={COIN} />
      <CoinStack x={118} y={96} z={P} count={4} color={COIN} />
      <motion.g {...float(5, 4.5)}>
        <CoinStack x={70} y={104} z={P + 34} count={1} color={COIN} />
      </motion.g>
    </Svg>
  );
}

/** Plug and Play onboarding: a plug lowering into a socket block. */
export function PlugIn({ className }: SceneProps) {
  const P = 10;
  const sx = 46; // socket block origin
  const sy = 46;
  return (
    <Svg viewBox="-161 -136 322 330" label="Illustration: a plug lowering into a socket, ready to connect." className={className}>
      <Plinth w={170} d={170} h={P} />
      <Shadow x={sx} y={sy} w={80} d={80} z={P} opacity={0.12} />
      <Box x={sx} y={sy} z={P} w={80} d={80} h={44} color="var(--carbon)" top="var(--graphite)" shadeLeft={8} shadeRight={22} />
      {/* Sockets on the top face. */}
      {[0, 1].map((i) => (
        <polygon
          key={i}
          points={pts([sx + 26 + i * 20, sy + 30, P + 44], [sx + 34 + i * 20, sy + 30, P + 44], [sx + 34 + i * 20, sy + 50, P + 44], [sx + 26 + i * 20, sy + 50, P + 44])}
          style={{ fill: 'var(--carbon)' }}
        />
      ))}
      {/* Ready light on the front face. */}
      <g transform={leftPlaneMatrix(sx, sy + 80, P)}>
        <rect x="10" y="30" width="24" height="5" rx="2.5" style={{ fill: 'var(--fund)' }} />
      </g>

      <motion.g animate={{ y: [0, 10, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}>
        {/* Cable, rising out of frame. */}
        <path
          d={(() => {
            const [ax, ay] = iso([sx + 40, sy + 40, P + 132]);
            return `M${ax} ${ay} C ${ax} ${ay - 40}, ${ax + 40} ${ay - 50}, ${ax + 70} ${ay - 80}`;
          })()}
          fill="none"
          stroke="var(--carbon)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {[0, 1].map((i) => (
          <Box key={i} x={sx + 27 + i * 20} y={sy + 36} z={P + 76} w={6} d={8} h={22} color="var(--line-strong)" />
        ))}
        <Box x={sx + 16} y={sy + 22} z={P + 98} w={48} d={36} h={34} color="var(--surface)" shadeLeft={6} shadeRight={16} />
        <g transform={leftPlaneMatrix(sx + 16, sy + 58, P + 98)}>
          <rect x="8" y="14" width="18" height="4" rx="2" style={{ fill: 'var(--tech)' }} />
        </g>
      </motion.g>
    </Svg>
  );
}

/** A roadmap: a path across the plinth past milestones to a flag. */
export function RoadmapPath({ className }: SceneProps) {
  const P = 10;
  const route: [number, number][] = [
    [16, 128],
    [70, 128],
    [70, 78],
    [130, 78],
    [130, 30],
    [176, 30],
  ];
  const path = route.map(([x, y], i) => `${i ? 'L' : 'M'}${iso([x, y, P]).join(' ')}`).join(' ');

  return (
    <Svg viewBox="-144 -24 328 211" label="Illustration: a path winding past milestones to a finish flag." className={className}>
      <Plinth w={196} d={150} h={P} />
      <path d={path} fill="none" style={{ stroke: 'var(--mist)' }} strokeWidth="16" strokeLinejoin="round" strokeLinecap="round" />
      <path d={path} fill="none" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
      <motion.path
        d={path}
        fill="none"
        stroke="var(--carbon)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 0.62 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Start, milestones, finish. */}
      <ellipse cx={iso([16, 128, P])[0]} cy={iso([16, 128, P])[1]} rx="7" ry="4" style={{ fill: 'var(--carbon)' }} />
      <Box x={64} y={122} z={P} w={12} d={12} h={14} color="var(--dim-business-model)" />
      <Box x={124} y={72} z={P} w={12} d={12} h={24} color="var(--dim-market)" />
      <Flag x={176} y={30} z={P} height={52} color="var(--fund)" />
      <CoinStack x={150} y={118} z={P} count={3} color={COIN} />
    </Svg>
  );
}

/* ─────────────────────────────── CTA ─────────────────────────────── */

/** For the navy CTA: a stepped podium with the score set into its top, coins in the air. */
export function ScorePodium({ className, score }: SceneProps & { score: number }) {
  const P = 14;
  const base = 'var(--graphite)';
  return (
    <Svg viewBox="-187 -86 374 294" label={`Illustration: a podium with the score ${score} set into its top, with coins floating above.`} className={className}>
      <Box x={0} y={0} w={200} d={200} h={P} color={tint(base, 6)} shadeLeft={18} shadeRight={34} />
      <Box x={30} y={30} z={P} w={140} d={140} h={22} color={tint(base, 16)} shadeLeft={18} shadeRight={34} />
      <Box x={50} y={50} z={P + 22} w={100} d={100} h={22} color={tint(base, 28)} shadeLeft={18} shadeRight={34} />
      <Box x={66} y={66} z={P + 44} w={68} d={68} h={26} color="var(--fund)" shadeLeft={14} shadeRight={30} />
      <g transform={topPlaneMatrix(P + 70)}>
        <text
          x="100"
          y="100"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="30"
          fontWeight="700"
          className="font-display tabular"
          style={{ fill: 'var(--carbon)' }}
        >
          {score}
        </text>
      </g>

      {[
        { x: 30, y: 150, z: 120, d: 0 },
        { x: 170, y: 40, z: 150, d: 0.8 },
        { x: 214, y: 120, z: 50, d: 1.6 },
      ].map((c, i) => (
        <motion.g key={i} {...float(8, 5 + i, c.d)}>
          <CoinStack x={c.x} y={c.y} z={c.z} count={1} r={12} color={COIN} />
        </motion.g>
      ))}
    </Svg>
  );
}
