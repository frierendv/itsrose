"use client";

import { GridPattern } from "@/components/ui/grid-pattern";
import { Spotlight } from "@/components/ui/spotlight";
import { ArrowRight, Check, Rocket, ShieldCheck } from "@gravity-ui/icons";
import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

export function CtaSection() {
	return (
		<section
			aria-labelledby="cta-heading"
			className="relative overflow-hidden border-border/60 border-b bg-surface-secondary/40 py-20 lg:py-28"
		>
			<Spotlight className="-top-20 left-1/4" />
			<GridPattern
				width={40}
				height={40}
				squares={[
					[4, 2],
					[8, 3],
					[12, 1],
				]}
			/>

			<div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="border border-border bg-surface p-8 shadow-2xl sm:p-12 lg:p-16">
					<div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
						{/* Left Column (Headline & CTAs) */}
						<div className="flex flex-col items-start text-left lg:col-span-8">
							<div className="inline-flex items-center gap-2 border border-border bg-surface-secondary px-2.5 py-1 text-xs">
								<Rocket className="size-3.5 text-accent" />
								<span className="font-semibold text-accent uppercase tracking-wider">
									Get Started Today
								</span>
							</div>

							<h2
								id="cta-heading"
								className="mt-4 font-bold text-3xl text-foreground tracking-tight sm:text-4xl lg:text-5xl"
							>
								Ready to accelerate your multimodal AI pipeline?
							</h2>

							<p className="mt-4 max-w-xl text-base text-muted leading-relaxed">
								Join thousands of engineers deploying vision,
								voice, generative diffusion, and web scrapers
								with low latency and zero data retention.
							</p>

							<div className="mt-8 flex flex-wrap items-center gap-4">
								<NextLink
									href="https://dash.itsrose.net/sign-up"
									className={buttonVariants({
										variant: "primary",
										size: "lg",
										className: "font-semibold",
									})}
								>
									<span>Create Free Developer Account</span>
									<ArrowRight className="size-4" />
								</NextLink>

								<NextLink
									href="#playground"
									className={buttonVariants({
										variant: "outline",
										size: "lg",
										className: "font-medium",
									})}
								>
									Open Live Sandbox
								</NextLink>
							</div>

							<div className="mt-8 flex flex-wrap items-center gap-6 text-muted text-xs">
								<div className="flex items-center gap-2">
									<Check className="size-3.5 text-accent" />
									<span>No credit card required</span>
								</div>
								<div className="flex items-center gap-2">
									<Check className="size-3.5 text-accent" />
									<span>1,000 free monthly credits</span>
								</div>
								<div className="flex items-center gap-2">
									<ShieldCheck className="size-3.5 text-accent" />
									<span>Instant live API key generation</span>
								</div>
							</div>
						</div>

						{/* Right Column (Quick Token Snippet Box) */}
						<div className="border border-border bg-surface-secondary/70 p-6 lg:col-span-4">
							<div className="font-semibold text-foreground text-xs uppercase tracking-wide">
								Instant Authentication
							</div>
							<p className="mt-1 text-muted text-xs">
								Include your secret bearer token in standard
								HTTP headers:
							</p>

							<div className="mt-4 border border-border bg-surface p-3 font-mono text-[11px] text-foreground/90">
								<div className="text-muted"># HTTP Header</div>
								<div className="text-accent">
									Authorization:
								</div>
								<div className="break-all">
									Bearer rose_live_9a710294fc...
								</div>
							</div>

							<div className="mt-4 text-[11px] text-muted">
								Ready to paste into your Next.js, Python, or
								curl pipelines.
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
