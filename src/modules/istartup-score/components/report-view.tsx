'use client';

import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { ArrowUpRight, Download, PencilLine, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { MAX_SCORE, PROFILE_FIELDS, QUESTIONS, SECTIONS, questionsIn, sectionOf } from '../assessment/bank';
import {
  BAND_THRESHOLDS,
  LEVEL_LABEL,
  priorityActions,
  recoverablePoints,
  type Finding,
  type IStartupReport,
  type Level,
} from '../assessment/scoring';
import { Eyebrow, Panel } from './chrome';

/**
 * The finished report. Like FounderFit's results view it computes nothing of its own —
 * every number comes from `computeReport`, so what is shown can never disagree with what
 * was scored. Layout: a dark readout hero, then a restrained paper report body that
 * prints cleanly to PDF.
 */

const LEVEL_STYLE: Record<Level, string> = {
  strong: 'bg-good-soft text-good',
  solid: 'bg-brand-soft text-brand',
  developing: 'bg-warn-soft text-warn',
  gap: 'bg-risk-soft text-risk',
};

const BAND_SEGMENTS = [
  { label: 'Early stage', from: 0, to: BAND_THRESHOLDS[0] },
  { label: 'Emerging', from: BAND_THRESHOLDS[0], to: BAND_THRESHOLDS[1] },
  { label: 'Strong foundation', from: BAND_THRESHOLDS[1], to: BAND_THRESHOLDS[2] },
  { label: 'Investment ready', from: BAND_THRESHOLDS[2], to: MAX_SCORE },
];

export function ReportView({
  report,
  onEdit,
  onRestart,
}: {
  report: IStartupReport;
  onEdit: () => void;
  onRestart: () => void;
}) {
  const { profile, finalScore, band, categories, strengths, gaps } = report;
  const actions = priorityActions(report);
  const generated = format(new Date(report.generatedAt), 'MMMM d, yyyy');
  const scorePct = (finalScore / MAX_SCORE) * 100;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>Assessment complete</Eyebrow>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <PencilLine className="h-3.5 w-3.5" /> Edit answers
          </Button>
          <Button variant="ghost" size="sm" onClick={onRestart}>
            <RotateCcw className="h-3.5 w-3.5" /> Start a new assessment
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Download className="h-3.5 w-3.5" /> Download PDF
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="space-y-6"
      >
        {/* ── Hero readout ── */}
        <section className="print-exact avoid-break rounded-xl bg-readout p-6 text-readout-ink sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-readout-mut">
                iSTARTUP Score report · {generated}
              </p>
              <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{profile.name}</h1>
              <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
                <p className="leading-none">
                  <span className="font-mono text-6xl font-semibold tabular sm:text-7xl">{finalScore}</span>
                  <span className="ml-2 font-mono text-sm text-readout-mut">/ {MAX_SCORE}</span>
                </p>
                <div className="max-w-sm pb-1">
                  <p className="text-lg font-semibold text-[#8CC8FF]">{band.label}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-readout-ink/75">{band.description}</p>
                </div>
              </div>
            </div>
            <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2.5 font-mono text-xs md:grid-cols-1 md:text-right">
              {PROFILE_FIELDS.map((f) => (
                <div key={f.key}>
                  <dt className="text-readout-mut">{f.label}</dt>
                  <dd className="mt-0.5 text-readout-ink">{profile[f.key] ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Score scale: where the score sits against the four readiness bands. */}
          <div className="mt-8">
            <div className="relative">
              <div className="flex h-2 gap-[2px] overflow-hidden rounded-[4px]">
                {BAND_SEGMENTS.map((seg) => (
                  <div
                    key={seg.label}
                    className={cn('h-full', finalScore > seg.from ? 'bg-readout-line' : 'bg-readout-line/50')}
                    style={{ width: `${((seg.to - seg.from) / MAX_SCORE) * 100}%` }}
                  />
                ))}
              </div>
              <div className="absolute inset-y-0 left-0 h-2 rounded-[4px] bg-brand-bright" style={{ width: `${scorePct}%` }} />
              <div
                className="absolute -top-1.5 h-5 w-[3px] -translate-x-1/2 rounded-full bg-readout-ink ring-2 ring-readout"
                style={{ left: `${scorePct}%` }}
                aria-hidden
              />
            </div>
            <div className="mt-2.5 flex font-mono text-[10px] uppercase tracking-wider">
              {BAND_SEGMENTS.map((seg) => (
                <span
                  key={seg.label}
                  className={cn('truncate pr-1', seg.label === band.label ? 'text-readout-ink' : 'text-readout-mut/80')}
                  style={{ width: `${((seg.to - seg.from) / MAX_SCORE) * 100}%` }}
                >
                  {seg.label}
                  <span className="ml-1 hidden text-readout-mut/70 lg:inline">{seg.from}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Dimension breakdown ── */}
        <Panel className="avoid-break">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Score by dimension</h2>
            <p className="font-mono text-[11px] text-mut">Percent of available points · weight in final score</p>
          </div>
          <div className="mt-5 space-y-4">
            {categories.map((c) => {
              const section = sectionOf(c.key);
              return (
                <div key={c.key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[180px_1fr_150px]">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      <span className="mr-1.5 font-mono text-xs text-mut">{String(section.ordinal).padStart(2, '0')}</span>
                      {c.title}
                    </p>
                    <p className="font-mono text-[11px] text-mut">{Math.round(c.weight * 100)}% weight · {c.points} pts</p>
                  </div>
                  <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
                    <div
                      className="relative h-2.5 rounded-[4px] bg-line"
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={c.percent}
                      aria-label={`${c.title} ${c.percent}%`}
                      title={`${c.title}: ${c.percent}% of available points`}
                    >
                      <div className="h-full rounded-[4px] bg-brand" style={{ width: `${c.percent}%` }} />
                      {/* 60% marks "solid" — the line between a dimension that holds and one that needs work. */}
                      <div className="absolute inset-y-[-3px] left-[60%] w-px bg-line-strong" aria-hidden />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2.5">
                    <span className="font-mono text-sm font-semibold text-ink tabular">{c.percent}%</span>
                    <span className={cn('w-[86px] rounded-full px-2 py-0.5 text-center text-[11px] font-semibold', LEVEL_STYLE[c.level])}>
                      {LEVEL_LABEL[c.level]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* ── Strengths & gaps ── */}
        <div className="grid gap-6 md:grid-cols-2">
          <FindingList
            title="Key strengths"
            empty="No answers reached 4 or 5 yet — the priority actions below are where strengths will come from."
            findings={strengths}
            tone="good"
            textOf={(f) => f.question.strength}
          />
          <FindingList
            title="Critical gaps"
            empty="No answers of 1 or 2 — there are no critical gaps. See the priority actions for the next level."
            findings={gaps}
            tone="risk"
            textOf={(f) => f.question.gap}
          />
        </div>

        {/* ── Priority actions ── */}
        {actions.length > 0 ? (
          <Panel className="avoid-break">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-ink">Priority actions</h2>
              <p className="font-mono text-[11px] text-mut">Ranked by points recoverable</p>
            </div>
            <ol className="mt-4 divide-y divide-line">
              {actions.map((f, i) => (
                <li key={f.question.id} className="flex gap-4 py-3.5 first:pt-1 last:pb-0">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs font-semibold text-white print-exact">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {f.question.title}
                      <span className="ml-2 font-mono text-[11px] font-normal text-mut">{sectionOf(f.question.category).title}</span>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ink/85">{f.question.action}</p>
                  </div>
                  <span className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 self-start font-mono text-xs font-semibold text-good tabular">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    up to {Math.round(recoverablePoints(f.question, f.value))} pts
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        ) : null}

        {/* ── Overview ── */}
        <Panel className="avoid-break">
          <h2 className="text-lg font-semibold text-ink">Startup overview</h2>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{profile.description}</p>
        </Panel>

        {/* ── Appendix ── */}
        <Panel>
          <h2 className="text-lg font-semibold text-ink">Appendix · Responses</h2>
          <p className="mt-1 text-sm text-mut">Every answer as given, by section.</p>
          <div className="mt-5 space-y-6">
            {SECTIONS.map((section) => (
              <div key={section.key} className="avoid-break">
                <Eyebrow className="mb-2">
                  {String(section.ordinal).padStart(2, '0')} · {section.title}
                </Eyebrow>
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-line border-y border-line">
                    {questionsIn(section.key).map((q) => {
                      const value = report.answers[q.id];
                      return (
                        <tr key={q.id} className="align-top">
                          <td className="w-[34%] py-2.5 pr-4 font-medium text-ink">{q.title}</td>
                          <td className="py-2.5 pr-4 text-mut">{q.options.find((o) => o.value === value)?.label}</td>
                          <td className="w-10 py-2.5 text-right font-mono font-semibold text-ink tabular">{value}/5</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Panel>

        <p className="px-1 text-xs leading-relaxed text-mut">
          <strong className="font-semibold text-ink">Methodology.</strong> {QUESTIONS.length} questions across five weighted
          dimensions ({SECTIONS.map((s) => `${s.title} ${Math.round(s.weight * 100)}%`).join(', ')}). Each answer earns
          one-fifth of its question’s points per level; a dimension’s score is points earned over points available, and the
          final score is the weighted sum scaled to {MAX_SCORE}. Self-reported: the score reflects the answers given and is
          best used alongside supporting evidence.
        </p>
      </motion.div>
    </div>
  );
}

function FindingList({
  title,
  empty,
  findings,
  tone,
  textOf,
}: {
  title: string;
  empty: string;
  findings: Finding[];
  tone: 'good' | 'risk';
  textOf: (f: Finding) => string;
}) {
  const Icon = tone === 'good' ? TrendingUp : TrendingDown;
  return (
    <Panel className="avoid-break">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <Icon className={cn('h-4 w-4', tone === 'good' ? 'text-good' : 'text-risk')} aria-hidden />
        {title}
      </h2>
      {findings.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-mut">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {findings.map((f) => (
            <li
              key={f.question.id}
              className={cn('rounded-md border border-line border-l-4 bg-surface px-3.5 py-3', tone === 'good' ? 'border-l-good' : 'border-l-risk')}
            >
              <p className="flex items-baseline justify-between gap-3 text-sm font-semibold text-ink">
                {f.question.title}
                <span className={cn('font-mono text-xs', tone === 'good' ? 'text-good' : 'text-risk')}>{f.value}/5</span>
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink/80">{textOf(f)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
