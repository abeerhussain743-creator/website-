import { Navbar } from "@/components/navbar/navbar";
import { Hero } from "@/components/hero/hero";
import { Trust } from "@/components/trust/trust";
import { Problem } from "@/components/problem/problem";
import { Transform } from "@/components/transform/transform";
import { Services } from "@/components/services/services";
import { Agents } from "@/components/agents/agents";
import { Products } from "@/components/products/products";
import { CompetitorIntel } from "@/components/products/competitor-intel";
import { Industries } from "@/components/industries/industries";
import { HowItWorks } from "@/components/how-it-works/how-it-works";
import { CaseStudies } from "@/components/case-studies/case-studies";
import { AutomationBuilder } from "@/components/automation-builder/automation-builder";
import { RoiCalculator } from "@/components/roi-calculator/roi-calculator";
import { About } from "@/components/about/about";
import { FinalCta } from "@/components/cta/final-cta";
import { Footer } from "@/components/footer/footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Trust />
        <Problem />
        <Transform />
        <Services />
        <Agents />
        <Products />
        <CompetitorIntel />
        <Industries />
        <HowItWorks />
        <CaseStudies />
        <AutomationBuilder />
        <RoiCalculator />
        <About />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
