"use client";

import { InViewReveal } from "@/client/landing/ui";
import {
	ArrowRight,
	ArrowUpRightFromSquare,
	Sparkles,
} from "@gravity-ui/icons";
import { buttonVariants, Card, Chip, Link } from "@heroui/react";
import { cn } from "@itsrose/react/core";
import { memo } from "react";

export const LandingCta = memo(() => {
	return (
		<section className="relative w-full py-16 md:py-24 flex flex-col items-center">
			<InViewReveal className="w-full max-w-5xl">
				<Card className="border border-accent/30 bg-surface shadow-2xl relative overflow-hidden text-center p-8 sm:p-12 md:p-16">
					{/* Background subtle accent glow */}
					<div className="absolute inset-0 bg-accent/5 pointer-events-none" />

					<div className="relative z-10 max-w-2xl mx-auto space-y-6">
						<div className="inline-flex items-center justify-center">
							<Chip
								variant="soft"
								className="bg-accent/20 text-foreground font-medium border border-accent/30 py-0.5 px-3"
							>
								<span className="flex items-center gap-1.5 text-xs sm:text-sm">
									<Sparkles className="size-3.5 text-accent" />
									<span>Start in Under 2 Minutes</span>
								</span>
							</Chip>
						</div>

						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
							Build Powerful AI &amp; Media Features Today
						</h2>

						<p className="text-sm sm:text-base md:text-lg text-muted leading-relaxed">
							Join developers who rely on ItsRose for
							production-grade computer vision, neural voice
							synthesis, interactive AI personas, and social media
							extraction.
						</p>

						<div className="pt-2 flex flex-wrap items-center justify-center gap-4">
							<Link
								href="/sign-in"
								className={cn(
									"font-semibold gap-2 shadow-lg shadow-accent/10",
									buttonVariants({
										variant: "primary",
										size: "lg",
									})
								)}
							>
								Create Free Account
								<Link.Icon>
									<ArrowRight className="size-4" />
								</Link.Icon>
							</Link>
							<Link
								href="/resource/api-reference"
								className={cn(
									"font-semibold gap-2",
									buttonVariants({
										variant: "outline",
										size: "lg",
									})
								)}
							>
								<span>Read the API Docs</span>
								<Link.Icon>
									<ArrowUpRightFromSquare className="size-4" />
								</Link.Icon>
							</Link>
						</div>
					</div>
				</Card>
			</InViewReveal>
		</section>
	);
});

LandingCta.displayName = "LandingCta";
