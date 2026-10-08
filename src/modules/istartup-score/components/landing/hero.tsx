'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle2, TrendingUp } from 'lucide-react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

import { EASE_OUT, Reveal } from '@/components/reveal';
import { cn } from '@/lib/utils';
import { container } from './ui';

function AnimatedScore({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const animation = animate(count, value, {
      duration: 2.5,
      ease: EASE_OUT,
    });
    return animation.stop;
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24 bg-[var(--bg)] font-sans">
      <PulsingGrid />
      <div className={container}>
        <div className="grid items-start gap-16 lg:grid-cols-12 lg:gap-12">
          
          {/* LEFT SIDE */}
          <div className="lg:col-span-7">
            <Reveal immediate y={15}>
              <p className="text-[11px] font-bold tracking-[0.12em] text-[#657184] uppercase mb-4">
                Startup Intelligence
              </p>
              <h1 className="text-[clamp(3.5rem,1.5rem+4.5vw,5.5rem)] font-bold leading-[1.05] text-[#071B38] tracking-[-0.02em]">
                KNOW HOW<br />
                <span className="text-[#36D5BF]">FUNDABLE</span><br />
                YOUR STARTUP IS.
              </h1>
            </Reveal>

            <Reveal immediate y={15} delay={80}>
              <p className="mt-8 max-w-[500px] text-[17px] leading-[1.6] text-[#657184]">
                Get an independent, data-driven assessment of your startup and understand where you stand before approaching investors.
              </p>
            </Reveal>

            <Reveal immediate y={15} delay={140}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/interview"
                  className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[8px] bg-[#071B38] px-6 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
                >
                  ASSESS YOUR STARTUP <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[8px] border border-[#071B38] bg-transparent px-6 text-[14px] font-semibold text-[#071B38] transition-colors hover:bg-[#071B38]/5"
                >
                  SEE HOW IT WORKS
                </a>
              </div>
            </Reveal>

            <Reveal immediate y={15} delay={200}>
              <div className="mt-16 flex items-center divide-x divide-[#D9E0E5]">
                <ProofPoint num="01" text="REAL MARKET DATA" icon={<BarChart3 className="h-4 w-4" strokeWidth={1.5} />} />
                <ProofPoint num="02" text="INVESTOR-ALIGNED INSIGHTS" icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />} />
                <ProofPoint num="03" text="ACTIONABLE NEXT STEPS" icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />} />
              </div>
            </Reveal>
          </div>

          {/* RIGHT SIDE - DATA COMPOSITION */}
          <div className="lg:col-span-5 relative h-full min-h-[500px]">
            {/* Background geometric stairs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 flex items-end">
              <svg viewBox="0 0 400 500" preserveAspectRatio="none" className="w-full h-full text-[#EAF0F3] opacity-80">
                <path d="M0,500 L0,400 L80,400 L80,300 L160,300 L160,200 L240,200 L240,100 L320,100 L320,0 L400,0 L400,500 Z" fill="currentColor" />
              </svg>
            </div>

            <Reveal immediate y={15} delay={100} className="relative z-10 pt-4 pl-4 lg:pl-10 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#657184]">
                  Investor Readiness
                </p>
                <div className="text-right">
                  <span className="text-[13px] font-semibold text-[#36D5BF]">↑ 12%</span>
                  <span className="ml-2 text-[11px] text-[#657184]">vs. last assessment</span>
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-[120px] font-bold leading-none tracking-tight text-[#071B38]">
                  <AnimatedScore value={352} />
                </span>
                <span className="text-[40px] font-semibold text-[#C4CED6]">/ 500</span>
              </div>

              <div className="mt-4 inline-flex items-center rounded-full border border-[#36D5BF] bg-[#36D5BF]/10 px-3 py-1 self-start">
                <span className="text-[10px] font-bold tracking-[0.08em] text-[#36D5BF] uppercase">
                  Strong Foundation
                </span>
              </div>

              <div className="mt-12 space-y-4 relative">
                {/* The living line connecting the dimensions */}
                <motion.div 
                  className="absolute left-[-16px] top-4 bottom-4 w-[1px] bg-[#36D5BF]"
                  initial={{ height: 0 }}
                  animate={{ height: '100%' }}
                  transition={{ duration: 1.5, ease: EASE_OUT, delay: 0.5 }}
                />

                <Dimension 
                  label="01 MANAGEMENT" 
                  score={68} 
                  color="#36D5BF" 
                  delay={0.6}
                  desc="Leadership experience and technical capability." 
                />
                <Dimension 
                  label="02 MOMENTUM" 
                  score={72} 
                  color="#36D5BF" 
                  delay={0.7}
                  desc="Recent growth metrics and product velocity." 
                />
                <Dimension 
                  label="03 BUSINESS MODEL" 
                  score={60} 
                  color="#36D5BF" 
                  delay={0.8}
                  desc="Unit economics, margins, and path to profitability." 
                />
                <Dimension 
                  label="04 MARKET" 
                  score={70} 
                  color="#36D5BF" 
                  delay={0.9}
                  desc="Size, growth and competitive landscape." 
                />
                <Dimension 
                  label="05 MOTIVATION" 
                  score={55} 
                  color="#F5A623" 
                  delay={1.0}
                  desc="Founder commitment and alignment." 
                />
              </div>

            </Reveal>
          </div>
        </div>

        {/* BOTTOM OF HERO - JOURNEY */}
        <Reveal immediate y={15} delay={300}>
          <JourneyLine />
        </Reveal>

      </div>
    </section>
  );
}

function ProofPoint({ num, text, icon }: { num: string; text: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-6 first:pl-0 last:pr-0">
      <div className="flex items-center gap-2 text-[#36D5BF]">
        {icon}
        <span className="text-[12px] font-bold font-mono">{num}</span>
      </div>
      <span className="text-[11px] font-bold tracking-wider text-[#071B38] uppercase max-w-[140px] leading-tight">
        {text}
      </span>
    </div>
  );
}

function Dimension({ label, desc, score, color, delay }: { label: string; desc: string; score: number; color: string; delay: number }) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div 
      className="group cursor-default relative pl-4"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex justify-between text-[11px] font-bold tracking-wider text-[#071B38] mb-2 uppercase transition-colors group-hover:text-[#36D5BF]">
        <span>{label}</span>
        <span>{score}%</span>
      </div>
      
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: hovered ? 'auto' : 0, opacity: hovered ? 1 : 0 }}
        className="overflow-hidden"
      >
        <p className="text-[12px] text-[#657184] pb-3 border-l-2 pl-3 mb-2 transition-colors" style={{ borderColor: color }}>
          {desc}
          <span className="block mt-1 text-[#36D5BF] font-semibold">↑ +8% vs. sector average</span>
        </p>
      </motion.div>

      <div className="h-[2px] w-full bg-[#EAF0F3]">
        <motion.div
          className="h-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.5, ease: EASE_OUT, delay }}
        />
      </div>
    </div>
  );
}

function JourneyLine() {
  const JOURNEY = ['IDEA', 'VALIDATION', 'TRACTION', 'GROWTH', 'FUNDING'];
  
  return (
    <div className="mt-24 pt-8 relative max-w-5xl mx-auto lg:mx-0">
      {/* Background track */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-[#D9E0E5]" />
      
      {/* Living animated line */}
      <div className="absolute top-0 left-0 w-full h-[1px]">
        <motion.div 
          className="h-full bg-[#36D5BF]"
          initial={{ width: '0%' }}
          animate={{ width: '75%' }} /* Progress to GROWTH */
          transition={{ duration: 3, ease: EASE_OUT, delay: 0.5 }}
        />
      </div>

      <div className="flex justify-between items-center text-[11px] font-semibold tracking-widest text-[#657184] relative px-2">
        {JOURNEY.map((stage, i) => {
          const isActive = i <= 3; // Up to GROWTH
          return (
            <span key={stage} className={cn("relative transition-colors duration-1000", isActive ? "text-[#071B38]" : "")}>
              {stage}
            </span>
          )
        })}
        
        {/* The moving dot */}
        <motion.div 
          className="absolute top-[-32px] h-2.5 w-2.5 rounded-full bg-[#36D5BF] -translate-y-1/2 shadow-[0_0_12px_rgba(54,213,191,0.8)]"
          initial={{ left: '0%' }}
          animate={{ left: '75%' }}
          transition={{ duration: 3, ease: EASE_OUT, delay: 0.5 }}
        />
      </div>
    </div>
  );
}

function PulsingGrid() {
  return (
    <div 
      className="absolute inset-0 pointer-events-none -z-20 opacity-[0.08]" 
      style={{ backgroundImage: 'radial-gradient(circle, #071B38 1px, transparent 1px)', backgroundSize: '24px 24px' }}
    >
      <motion.div 
        className="absolute inset-0 bg-[#36D5BF]"
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{ 
          WebkitMaskImage: 'radial-gradient(circle at 70% 30%, black 10%, transparent 60%)',
          maskImage: 'radial-gradient(circle at 70% 30%, black 10%, transparent 60%)' 
        }}
      />
      <motion.div 
        className="absolute inset-0 bg-[#36D5BF]"
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{ 
          WebkitMaskImage: 'radial-gradient(circle at 30% 80%, black 5%, transparent 40%)',
          maskImage: 'radial-gradient(circle at 30% 80%, black 5%, transparent 40%)' 
        }}
      />
    </div>
  );
}
