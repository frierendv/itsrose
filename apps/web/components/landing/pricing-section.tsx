"use client";

import { CardSpotlight } from "@/components/ui/card-spotlight";
import { ArrowRight, Check, Star } from "@gravity-ui/icons";
import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

const TIERS = [
	{
		name: "Developer",
		price: "$0",
		cadence: "forever free",
		description:
			"Everything you need to prototype, test, and ship your next side project or proof-of-concept.",
		isPopular: false,
		features: [
			"1,000 monthly execution credits",
			"Access to all multimodal endpoints",
			"Standard edge gateway routing",
			"Rate limit: 20 requests / min",
			"Community Discord support",
			"Ephemeral zero-retention privacy",
		],
		ctaText: "Start Building Free",
		ctaVariant: "outline" as const,
		href: "https://dash.itsrose.net/sign-up",
	},
	{
		name: "Pro Builder",
		price: "$29",
		cadence: "per month",
		description:
			"Engineered for scaling applications and production workflows demanding high throughput and low latency.",
		isPopular: true,
		features: [
			"50,000 monthly execution credits",
			"Priority Anycast edge routing (<42ms P95)",
			"Rate limit: 150 requests / min",
			"Dedicated Webhook delivery queues",
			"Fast-lane Server-Sent Events (SSE)",
			"Direct email & developer ticket support",
			"Over-usage at $0.0006 / credit",
		],
		ctaText: "Get Pro Access",
		ctaVariant: "primary" as const,
		href: "https://dash.itsrose.net/sign-up",
	},
	{
		name: "Enterprise",
		price: "Custom",
		cadence: "tailored billing",
		description:
			"Dedicated infrastructure, tailored SLA commitments, and high-volume inference clusters.",
		isPopular: false,
		features: [
			"Custom high-volume credit quotas",
			"Dedicated GPU instances & reserved pools",
			"99.99% contract-backed uptime SLA",
			"Custom DPAs, SOC2 compliance & invoicing",
			"Shared Slack / Discord engineering bridge",
			"Custom model weights & LoRA fine-tuning",
		],
		ctaText: "Talk to Sales",
		ctaVariant: "outline" as const,
		href: "https://dash.itsrose.net",
	},
];

export function PricingSection() {
	return (
		<section
			id="pricing"
			aria-labelledby="pricing-heading"
			className="border-border/60 border-b py-20 lg:py-28"
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Section Header (Left-aligned) */}
				<div className="flex flex-col items-start text-left">
					<div className="inline-flex items-center gap-2 border border-border bg-surface px-2.5 py-1 text-xs">
						<Star className="size-3.5 text-accent" />
						<span className="font-semibold text-accent uppercase tracking-wider">
							Pricing & Credits
						</span>
					</div>

					<h2
						id="pricing-heading"
						className="mt-4 font-bold text-3xl text-foreground tracking-tight sm:text-4xl"
					>
						Simple, Transparent Developer Pricing.
					</h2>
					<p className="mt-3 max-w-2xl text-base text-muted leading-relaxed">
						Pay only for the computational requests you make. No
						hidden seat fees or artificial restrictions. Start free,
						scale seamlessly.
					</p>
				</div>

				{/* Pricing Cards Grid */}
				<div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
					{TIERS.map((tier) => (
						<CardSpotlight
							key={tier.name}
							className={`flex flex-col justify-between p-6 text-left ${
								tier.isPopular
									? "border-accent/40 bg-surface shadow-lg"
									: "bg-surface"
							}`}
						>
							<div>
								{/* Header & Tag */}
								<div className="flex items-center justify-between">
									<h3 className="font-bold text-foreground text-xl">
										{tier.name}
									</h3>
									{tier.isPopular && (
										<span className="border border-accent/30 bg-accent/15 px-2.5 py-0.5 font-semibold text-accent text-xs">
											Recommended
										</span>
									)}
								</div>

								{/* Price */}
								<div className="mt-4 flex items-baseline gap-2">
									<span className="font-bold font-mono text-4xl text-foreground tracking-tight">
										{tier.price}
									</span>
									<span className="font-mono text-muted text-xs">
										/ {tier.cadence}
									</span>
								</div>

								{/* Description */}
								<p className="mt-3 text-muted text-xs leading-relaxed">
									{tier.description}
								</p>

								{/* Features */}
								<ul className="mt-6 space-y-3 border-border border-t pt-6 text-xs">
									{tier.features.map((feature) => (
										<li
											key={feature}
											className="flex items-start gap-2.5 text-foreground/90"
										>
											<Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
											<span>{feature}</span>
										</li>
									))}
								</ul>
							</div>

							{/* CTA */}
							<div className="mt-8 border-border border-t pt-6">
								<NextLink
									href={tier.href}
									className={buttonVariants({
										variant: tier.ctaVariant,
										size: "md",
										className:
											"w-full justify-center font-semibold",
									})}
								>
									<span>{tier.ctaText}</span>
									<ArrowRight className="size-3.5" />
								</NextLink>
							</div>
						</CardSpotlight>
					))}
				</div>

				{/* Credit Rate Reference Bar */}
				<div className="mt-10 border border-border bg-surface-secondary/50 p-4 text-left">
					<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
						<div>
							<div className="font-semibold text-foreground text-xs uppercase tracking-wide">
								How Credits Work
							</div>
							<div className="mt-1 text-muted text-xs">
								1 Credit = 1 OCR or Web Extract operation &bull;
								2 Credits = 1 FLUX.1 image &bull; 1 Credit / 30s
								audio
							</div>
						</div>
						<div className="font-mono text-[11px] text-muted">
							Unused credits roll over on active Pro plans
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
