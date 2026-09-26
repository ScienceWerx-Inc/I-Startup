import Link from "next/link";
import { ArrowRight, Banknote, Compass, Rocket } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { MAX_SCORE, QUESTIONS, SECTIONS } from "../assessment/bank";
import { Eyebrow, SiteHeader, Wordmark } from "../components/chrome";

const steps = [
  {
    n: "01",
    title: "Profile your startup",
    description: "Name, stage, sector, team and funding to date. Unscored — it frames the report.",
  },
  {
    n: "02",
    title: `Answer ${QUESTIONS.length} anchored questions`,
    description: "Five sections, one question per screen. Pick the description that matches where you are today.",
  },
  {
    n: "03",
    title: "Get your readiness report",
    description: `A score out of ${MAX_SCORE}, a breakdown by dimension, your strengths, gaps, and the actions worth the most points.`,
  },
];

const whyItMatters = [
  {
    title: "Unlock non-dilutive capital",
    description: "A strong iSTARTUP Score serves as validation for grant agencies, improving your chances of early funding.",
    icon: Banknote,
  },
  {
    title: "Streamlined PNPL onboarding",
    description: "Scoring well accelerates your entry into the Plug and Play network and ecosystem.",
    icon: Rocket,
  },
  {
    title: "A roadmap, not just a number",
    description: "Every gap comes with a concrete next step, ranked by how many points it would recover.",
    icon: Compass,
  },
];

/** Illustrative only — labelled as an example on the page. */
const SAMPLE = [
  { title: "Management", percent: 84 },
  { title: "Momentum", percent: 60 },
  { title: "Business Model", percent: 72 },
  { title: "Motivation", percent: 76 },
  { title: "Market", percent: 68 },
];

export default function IStartupScoreLandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader
        right={
          <Link href="/interview" className={buttonVariants({ size: "sm" })}>
            Start assessment
          </Link>
        }
      />

      {/* ── Hero ── */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.1fr_1fr]">
          <Reveal>
            <Eyebrow>Startup readiness benchmark</Eyebrow>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[56px]">
              Know how fundable your startup is — <span className="text-brand">before investors decide.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-mut">
              The iSTARTUP Score benchmarks your venture across management, momentum, business model, motivation and
              market — the way seed investors and grant reviewers evaluate it — and tells you exactly what to fix first.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/interview" className={buttonVariants({ size: "lg" })}>
                Get your score <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how-it-works" className={buttonVariants({ size: "lg", variant: "outline" })}>
                How it works
              </a>
            </div>
            <p className="mt-6 font-mono text-xs text-mut">
              {QUESTIONS.length} questions · about 10 minutes · PDF report
            </p>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-xl bg-readout p-6 text-readout-ink shadow-[0_24px_60px_-24px_rgba(11,27,43,0.45)] sm:p-7">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-readout-mut">Example report</p>
                <p className="rounded-full border border-readout-line px-2 py-0.5 font-mono text-[10px] text-readout-mut">Illustrative</p>
              </div>
              <div className="mt-5 flex items-end gap-5">
                <p className="leading-none">
                  <span className="font-mono text-6xl font-semibold tabular">352</span>
                  <span className="ml-1.5 font-mono text-sm text-readout-mut">/ {MAX_SCORE}</span>
                </p>
                <div className="pb-1">
                  <p className="font-semibold text-[#8CC8FF]">Strong foundation</p>
                  <p className="text-[13px] text-readout-ink/70">Targeted fixes to investment-ready</p>
                </div>
              </div>
              <div className="mt-7 space-y-3.5">
                {SAMPLE.map((row) => (
                  <div key={row.title} className="grid grid-cols-[112px_1fr_36px] items-center gap-3">
                    <span className="text-[13px] text-readout-ink/85">{row.title}</span>
                    <div className="h-2 rounded-[4px] bg-readout-line">
                      <div className="h-full rounded-[4px] bg-brand-bright" style={{ width: `${row.percent}%` }} />
                    </div>
                    <span className="text-right font-mono text-xs text-readout-ink tabular">{row.percent}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-7 rounded-lg border border-readout-line p-3.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-readout-mut">Top priority action</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-readout-ink/85">
                  Convert pilots into paid engagements, even at a discount — one paying customer outweighs many free users.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="scroll-mt-16 border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              A structured assessment, not a questionnaire.
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-mut">
              Every question offers five concrete descriptions instead of a vague 1–5 rating, so your answer is a claim you
              can stand behind — and two founders who are in the same place get the same score.
            </p>
          </Reveal>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.n} className="bg-surface p-6 sm:p-7">
                <Reveal delay={i * 80}>
                  <p className="font-mono text-xs font-semibold text-brand">{step.n}</p>
                  <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mut">{step.description}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Dimensions ── */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <Eyebrow>Composite metric</Eyebrow>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Five weighted dimensions.</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-mut">
              Your score out of {MAX_SCORE} is the weighted sum of five independent sections. Momentum carries the most
              weight, because evidence the market is already responding matters most at seed.
            </p>
          </Reveal>
          <div className="mt-12 divide-y divide-line border-y border-line">
            {SECTIONS.map((s, i) => (
              <Reveal key={s.key} delay={i * 60}>
                <div className="grid items-center gap-2 py-5 sm:grid-cols-[64px_220px_1fr_140px] sm:gap-6">
                  <span className="font-mono text-xs text-mut">{String(s.ordinal).padStart(2, "0")}</span>
                  <span className="text-lg font-semibold">{s.title}</span>
                  <span className="text-sm leading-relaxed text-mut">{s.summary}</span>
                  <span className="flex items-center gap-3 sm:justify-end">
                    <span className="h-1.5 w-20 rounded-full bg-line">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${(s.weight / 0.25) * 100}%` }} />
                    </span>
                    <span className="w-9 text-right font-mono text-sm font-semibold tabular">{Math.round(s.weight * 100)}%</span>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why it matters ── */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <Eyebrow>Why it matters</Eyebrow>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              A strong idea is not enough. Investors need proof of execution.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {whyItMatters.map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={i * 80}>
                  <div className="h-full rounded-xl border border-line p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-mut">{item.description}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-8 rounded-xl bg-readout p-8 text-readout-ink sm:p-12 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Ready to see where you stand?</h2>
              <p className="mt-3 max-w-xl leading-relaxed text-readout-ink/75">
                Your iSTARTUP Score is a key part of the PNPL application. It takes about ten minutes, and your progress is
                saved as you go.
              </p>
            </div>
            <Link
              href="/interview"
              className={cn(buttonVariants({ size: "lg" }), "shrink-0 bg-surface text-ink hover:bg-brand-soft")}
            >
              Calculate your score <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-mut sm:px-6">
          <Wordmark />
          <span>© {new Date().getFullYear()} ScienceWerx · iSTARTUP Score</span>
        </div>
      </div>
    </div>
  );
}
