import { Assessment } from "../components/landing/assessment";
import { Benefits } from "../components/landing/benefits";
import { CTA } from "../components/landing/cta";
import { Footer } from "../components/landing/footer";
import { Hero } from "../components/landing/hero";
import { MotionRoot } from "../components/landing/motion-root";
import { Navbar } from "../components/landing/navbar";
import { Roadmap } from "../components/landing/roadmap";
import { ScoreBreakdown } from "../components/landing/score-breakdown";

export default function IStartupScoreLandingPage() {
  return (
    <MotionRoot>
      <div className="theme-landing min-h-screen overflow-x-clip">
        <Navbar />
        <Hero />
        <Assessment />
        <ScoreBreakdown />
        <Roadmap />
        <Benefits />
        <CTA />
        <Footer />
      </div>
    </MotionRoot>
  );
}
