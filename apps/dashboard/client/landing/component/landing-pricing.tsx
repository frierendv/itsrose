"use client";

import { InViewReveal } from "@/client/landing/ui";
import { Pricing } from "@/components/pricing";
import { CircleCheckFill, ShieldCheck } from "@gravity-ui/icons";
import { Chip } from "@heroui/react";
import { memo } from "react";

export const LandingPricing = memo(() => {
	return (
		<section
			id="pricing"
			className="relative w-full py-12 md:py-20 flex flex-col items-center"
		>
			<InViewReveal className="max-w-3xl text-center space-y-3 mb-12">
				<Chip
					variant="soft"
					className="bg-accent/15 text-foreground font-medium border border-accent/30 py-0.5 px-3"
				>
					<span className="text-xs uppercase tracking-wider font-semibold">
						Pricing Plans
					</span>
				</Chip>
				<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
					Transparent, Predictable Pricing
				</h2>
				<p className="text-sm sm:text-base text-muted max-w-xl mx-auto">
					Start for free with generous quotas. Upgrade as your product
					grows with no hidden fees and instant credit upgrades.
				</p>
			</InViewReveal>

			{/* Pricing Grid Component */}
			<InViewReveal delay={0.15} className="w-full max-w-6xl">
				<Pricing />
			</InViewReveal>

			{/* Trust / Security Note */}
			<InViewReveal
				delay={0.25}
				className="mt-8 w-full max-w-3xl flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-muted"
			>
				<div className="flex items-center gap-1.5">
					<ShieldCheck className="size-4 text-success" />
					<span>Secure checkout powered by Creem</span>
				</div>
				<div className="flex items-center gap-1.5">
					<CircleCheckFill className="size-4 text-success" />
					<span>Cancel or switch plans anytime</span>
				</div>
				<div className="flex items-center gap-1.5">
					<CircleCheckFill className="size-4 text-success" />
					<span>EU VAT &amp; invoice compliance</span>
				</div>
			</InViewReveal>
		</section>
	);
});

LandingPricing.displayName = "LandingPricing";
