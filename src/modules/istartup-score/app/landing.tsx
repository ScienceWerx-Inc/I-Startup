import { Challenge } from "../components/landing/intel/challenge";
import { Closing, Footer } from "../components/landing/intel/closing";
import { Faq } from "../components/landing/intel/faq";
import { Funders } from "../components/landing/intel/funders";
import { Hero } from "../components/landing/intel/hero";
import { HowItWorks } from "../components/landing/intel/how-it-works";
import { SiteNav } from "../components/landing/intel/site-nav";
import { MotionRoot } from "../components/landing/motion-root";

/**
 * iSTARTUP Score — startup intelligence in motion.
 *
 * One illustration language (rings, nodes, paths, panels) carried through every section,
 * and one example startup whose results come from the product's own scoring.
 */
export default function IStartupScoreLandingPage() {
  return (
    <MotionRoot>
      <div className="theme-bi min-h-screen overflow-x-clip">
        <SiteNav />
        <main>
          <Hero />
          <Challenge />
          <HowItWorks />
          <Funders />
          <Faq />
          <Closing />
        </main>
        <Footer />
      </div>
    </MotionRoot>
  );
}
