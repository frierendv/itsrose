import { BentoFeatures } from "@/components/landing/bento-features";
import { CapabilitiesShowcase } from "@/components/landing/capabilities-showcase";
import { CodeShowcase } from "@/components/landing/code-showcase";
import { CtaSection } from "@/components/landing/cta-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FooterSection } from "@/components/landing/footer-section";
import { HeroSection } from "@/components/landing/hero-section";
import { InfrastructureSection } from "@/components/landing/infrastructure-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { StatsBar } from "@/components/landing/stats-bar";

export default function Home() {
	return (
		<div className="relative flex w-full flex-col">
			{/* Hero Section with Live Sandbox */}
			<HeroSection />

			{/* Platform Telemetry & Metrics */}
			<StatsBar />

			{/* Core Architecture Bento Grid */}
			<BentoFeatures />

			{/* code-First Developer Experience */}
			<CodeShowcase />

			{/* Complete API Catalog & Capabilities */}
			<CapabilitiesShowcase />

			{/* Anycast Edge Network & Regional Latency Matrix */}
			<InfrastructureSection />

			{/* Transparent Developer Pricing & Credits */}
			<PricingSection />

			{/* Frequently Asked Questions (HeroUI Accordion) */}
			<FaqSection />

			{/* Final High-Impact CTA */}
			<CtaSection />

			{/* Comprehensive Semantic Footer */}
			<FooterSection />
		</div>
	);
}
