'use client';

import { motion } from 'framer-motion';
import { Award, BookOpenCheck, Check, GraduationCap, Loader2, Lock, Unlock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatPrice, type ProductPrice } from '@/hooks/use-account';

import { Panel } from './chrome';

/** Sits over the blurred report body until the founder unlocks the full report. */
export function UnlockCard({
  price,
  strengths,
  gaps,
  actions,
  busy,
  testMode,
  onUnlock,
}: {
  price: ProductPrice;
  strengths: number;
  gaps: number;
  actions: number;
  busy: boolean;
  testMode: boolean;
  onUnlock: () => void;
}) {
  const inside = [
    'Score by dimension across all five sections',
    `${strengths} key ${strengths === 1 ? 'strength' : 'strengths'} and ${gaps} critical ${gaps === 1 ? 'gap' : 'gaps'}, explained`,
    `${actions} priority ${actions === 1 ? 'action' : 'actions'}, ranked by points recoverable`,
    'Every response in an appendix, plus PDF download',
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-[0_24px_60px_-20px_rgba(11,27,43,0.35)] sm:p-7"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Lock className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">Your full report is ready</h2>
      <p className="mt-1 text-sm text-mut">Your score is above. Unlock the analysis behind it.</p>
      <ul className="mt-5 space-y-2.5">
        {inside.map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-sm text-ink">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" /> {line}
          </li>
        ))}
      </ul>
      <Button size="lg" className="mt-6 w-full" onClick={onUnlock} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
        Unlock full report · {formatPrice(price)}
      </Button>
      <p className="mt-2.5 text-center text-xs text-mut">
        One-time payment · unlocks every report on your account
        {testMode ? ' · test mode, no card charged' : ''}
      </p>
    </motion.div>
  );
}

/** Upsell for the gap-closing course, which ends in the 01 Certification. */
export function CourseOffer({
  price,
  owned,
  email,
  gapCount,
  busy,
  testMode,
  onEnroll,
}: {
  price: ProductPrice;
  owned: boolean;
  email: string;
  gapCount: number;
  busy: boolean;
  testMode: boolean;
  onEnroll: () => void;
}) {
  return (
    <Panel className="no-print overflow-hidden p-0 sm:p-0">
      <div className="grid md:grid-cols-[1fr_260px]">
        <div className="p-6 sm:p-8">
          <p className="eyebrow flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> iSTARTUP Course
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            {gapCount > 0
              ? `Close the ${gapCount} ${gapCount === 1 ? 'gap' : 'gaps'} your assessment found`
              : 'Take your startup to the next level'}
          </h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-mut">
            A guided course built around your results. Each module targets a gap in your report, with practical
            exercises you apply to your own startup, so your next iSTARTUP Score reflects real progress.
          </p>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {[
              'Modules matched to your weakest areas',
              'Templates and exercises for your startup',
              'Retake the assessment to track progress',
              'Certified on completion',
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm text-ink">
                <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {line}
              </li>
            ))}
          </ul>

          {owned ? (
            <p className="mt-6 flex items-start gap-2.5 rounded-lg border border-good/30 bg-good-soft p-3.5 text-sm text-ink">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" />
              <span>
                You&apos;re enrolled. Course access is sent to <strong className="font-semibold">{email}</strong>, and
                your 01 Certification is issued when you complete it.
              </span>
            </p>
          ) : (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={onEnroll} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                Enroll in the course · {formatPrice(price)}
              </Button>
              <span className="text-xs text-mut">One-time payment{testMode ? ' · test mode, no card charged' : ''}</span>
            </div>
          )}
        </div>

        {/* The certification, front and centre: it is what the course leads to. */}
        <div className="print-exact flex flex-col items-center justify-center gap-3 bg-readout p-8 text-center text-readout-ink">
          <motion.div
            initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
            whileInView={{ rotate: 0, scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 160, damping: 14 }}
            className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-brand-bright/70 bg-[radial-gradient(circle_at_30%_30%,#123456,#0b1b2b)]"
          >
            <span className="absolute inset-2 rounded-full border border-dashed border-readout-line" aria-hidden />
            <span className="font-mono text-4xl font-semibold tracking-tight">01</span>
            <Award className="absolute -bottom-2 h-7 w-7 rounded-full bg-brand-bright p-1 text-white" aria-hidden />
          </motion.div>
          <p className="mt-2 text-sm font-semibold">01 Certification</p>
          <p className="text-[13px] leading-relaxed text-readout-ink/70">
            Complete the course and you&apos;ll be certified with the 01 Certification.
          </p>
        </div>
      </div>
    </Panel>
  );
}
