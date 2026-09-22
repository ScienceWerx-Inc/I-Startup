"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, AreaChart } from "lucide-react";
import { motion } from "framer-motion";

function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: delay / 1000, ease: [0.25, 0.4, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

const pillars = [
  {
    tag: "Feasibility",
    title: "Technology Assessment",
    description: "Evaluates your IP and tech foundation to ensure it is robust, scalable, and defensible in a competitive market.",
    icon: Zap
  },
  {
    tag: "Viability",
    title: "Market Readiness",
    description: "Analyzes target demographics, market size, and commercialization pathways to validate your business model.",
    icon: ShieldCheck
  },
  {
    tag: "Desirability",
    title: "Team & Execution",
    description: "Assesses founder capability, advisory strength, and operational plans to ensure you can deliver on your promises.",
    icon: AreaChart
  }
];

const whyItMatters = [
  {
    title: "Unlock Non-Dilutive Capital",
    description: "A high iSTARTUP score serves as validation for grant agencies, significantly increasing your chances of securing early funding.",
    icon: Zap
  },
  {
    title: "Streamlined PNPL Onboarding",
    description: "Bypass standard vetting procedures. Scoring well accelerates your entry into the Plug and Play network and ecosystem.",
    icon: ShieldCheck
  },
  {
    title: "Identify Growth Areas",
    description: "The detailed breakdown highlights specific areas for improvement, providing an actionable roadmap to de-risk your venture.",
    icon: AreaChart
  }
];

export default function IStartupScoreLandingPage() {
  return (
    <div className="flex flex-col bg-[var(--background)] text-[var(--foreground)] relative min-h-screen overflow-hidden">
      
      {/* Abstract Glowing Background Orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[var(--primary-glow)] rounded-full blur-[120px] opacity-30 pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[var(--accent-glow)] rounded-full blur-[100px] opacity-20 pointer-events-none" />

      {/* ============================================================
          SECTION 1: HERO
          ============================================================ */}
      <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 lg:py-32 z-10">
        <div className="mx-auto w-full px-6 relative z-10" style={{ maxWidth: "1280px" }}>
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-xs font-mono font-medium text-[var(--accent)] mb-8 tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse"></span>
                Startup Readiness Benchmark
              </div>
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight">
                The <span className="text-gradient">iSTARTUP</span> Score.
              </h1>
            </Reveal>

            <Reveal delay={100}>
              <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
                A unified benchmark that proves your intellectual property is a fundable, commercially-viable asset. Measure your capability and readiness for seed-stage venture capital and non-dilutive funding.
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/interview" className="btn-primary text-lg">
                  Get Your Score <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#details" className="btn-glass text-lg">
                  Learn More
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2: THREE PILLARS
          ============================================================ */}
      <section id="details" className="relative py-28 lg:py-36 z-10">
        <div className="mx-auto w-full px-6 relative z-10" style={{ maxWidth: "1280px" }}>
          <Reveal>
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
              <div className="text-[var(--accent)] font-mono text-sm tracking-widest uppercase font-semibold">Composite Metric</div>
              <h2 className="text-4xl md:text-5xl font-bold">
                The Three Pillars of Your Score.
              </h2>
              <p className="text-white/60 text-lg leading-relaxed">
                Your iSTARTUP Score is derived from three independent, in-depth assessments. The average of these three scores creates a single number that defines your pathway to PNPL onboarding and investment.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {pillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <Reveal key={idx} delay={idx * 100}>
                  <div className="glass-card glass-card-hover p-8 h-full flex flex-col justify-between group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--accent)] group-hover:scale-110 group-hover:bg-[var(--primary-glow)] transition-all duration-300">
                          <Icon className="w-7 h-7" />
                        </div>
                        <span className="text-[11px] font-mono text-white/50 group-hover:text-[var(--accent)] font-semibold uppercase tracking-widest transition-colors">
                          {pillar.tag}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-[var(--accent)] transition-colors">
                          {pillar.title}
                        </h3>
                        <p className="text-base text-white/60 leading-relaxed">
                          {pillar.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: WHY IT MATTERS
          ============================================================ */}
      <section className="relative py-28 lg:py-36 border-t border-white/5 z-10 bg-black/20">
        <div className="mx-auto w-full px-6 relative z-10" style={{ maxWidth: "1280px" }}>
          <Reveal>
            <div className="max-w-3xl mb-20 space-y-4">
              <div className="text-[var(--accent)] font-mono text-sm tracking-widest uppercase font-semibold">Venture Metrics</div>
              <h2 className="text-4xl md:text-5xl font-bold">
                Why Your Score Matters.
              </h2>
              <p className="text-white/60 text-lg leading-relaxed">
                In the competitive world of early-stage funding, a strong idea is not enough. Investors and grant agencies need to see that you have a viable business with the potential for execution. The iSTARTUP Score provides that proof.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {whyItMatters.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Reveal key={idx} delay={idx * 100}>
                  <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 h-full group">
                    <div className="bg-[var(--primary-glow)] w-12 h-12 flex items-center justify-center rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-[var(--accent)]" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">
                      {item.title}
                    </h3>
                    <p className="text-base text-white/60 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: CTA
          ============================================================ */}
      <section className="relative py-32 lg:py-48 border-t border-white/10 text-center overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--primary-glow)] opacity-20 pointer-events-none" />
        
        <div className="mx-auto w-full px-6 relative z-10" style={{ maxWidth: "1280px" }}>
          <div className="max-w-4xl mx-auto space-y-10">
            <Reveal>
              <div className="text-[var(--accent)] font-mono text-sm tracking-widest uppercase font-semibold mb-4">Validate Your Business</div>
              <h2 className="text-5xl md:text-7xl font-bold">
                Ready to See <span className="text-gradient">Where You Stand?</span>
              </h2>
            </Reveal>

            <Reveal delay={100}>
              <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
                Your iSTARTUP Score is a critical component of the PNPL application process. Apply today to get your score and unlock your path to funding and commercialization.
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="pt-8 flex justify-center">
                <Link href="/interview" className="btn-primary text-xl px-10 py-5">
                  Calculate Your Score <ArrowRight className="h-6 w-6 ml-2" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
