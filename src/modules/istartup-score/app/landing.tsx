import { BeyondScore } from "../components/landing/editorial/beyond-score";
import { Closing } from "../components/landing/editorial/closing";
import { Hero } from "../components/landing/editorial/hero";
import { Nav } from "../components/landing/editorial/nav";
import { Plan } from "../components/landing/editorial/plan";
import { Readiness } from "../components/landing/editorial/readiness";
import { Working } from "../components/landing/editorial/working";
import { MotionRoot } from "../components/landing/motion-root";

/**
 * Know where your startup stands.
 *
 * Six sections, one idea — position — and one journey: assess → understand → improve →
 * prepare. The navigation tracks that journey as you read.
 */
export default function IStartupScoreLandingPage() {
  return (
    <MotionRoot>
      <div className="theme-ed min-h-screen overflow-x-clip">
        <Nav />
        <main>
          <Hero />
          <BeyondScore />
          <Working />
          <Plan />
          <Readiness />
          <Closing />
        </main>
      </div>
    </MotionRoot>
  );
}
