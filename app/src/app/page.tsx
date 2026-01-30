import {
  VerticalLines,
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  CTASection,
  CommunitySection,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <>
      {/* Vertical Container Lines (Visible only on lg) */}
      <VerticalLines />

      {/* Main Container - Full Width */}
      <div className="w-full z-10 relative">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
        <CommunitySection />
        <Footer />
      </div>
    </>
  );
}
