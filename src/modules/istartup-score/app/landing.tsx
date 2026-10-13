import { prices, type Price } from "@/lib/payments";
import { Challenge } from "../components/landing/intel/challenge";
import { Closing, Footer } from "../components/landing/intel/closing";
import { Faq } from "../components/landing/intel/faq";
import { Funders } from "../components/landing/intel/funders";
import { Hero } from "../components/landing/intel/hero";
import { HowItWorks } from "../components/landing/intel/how-it-works";
import { Pricing } from "../components/landing/intel/pricing";
import { Scoring } from "../components/landing/intel/scoring";
import { SiteNav } from "../components/landing/intel/site-nav";
import { MotionRoot } from "../components/landing/motion-root";

/**
 * Formatted on the server from the same config checkout charges. The page is static, so the
 * price is read at build time: redeploy after changing `REPORT_PRICE_CENTS`.
 */
function formatPrice(p: Price) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: p.currency.toUpperCase(),
    minimumFractionDigits: p.amountCents % 100 === 0 ? 0 : 2,
  }).format(p.amountCents / 100);
}

/**
 * iSTARTUP Score — startup intelligence in motion.
 *
 * One illustration language (rings, nodes, paths, panels) carried through every section,
 * and one example startup whose results come from the product's own scoring.
 */
export default function IStartupScoreLandingPage() {
  const reportPrice = formatPrice(prices().report);

  return (
    <MotionRoot>
      <div className="theme-bi min-h-screen overflow-x-clip">
        <SiteNav />
        <main>
          <Hero reportPrice={reportPrice} />
          <Challenge />
          <HowItWorks />
          <Scoring />
          <Pricing reportPrice={reportPrice} />
          <Funders />
          <Faq />
          <Closing />
        </main>
        <Footer />
      </div>
    </MotionRoot>
  );
}
