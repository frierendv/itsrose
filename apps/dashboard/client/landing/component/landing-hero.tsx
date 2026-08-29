"use client";

import {
	ContainerScroll,
	FlipWords,
	InViewReveal,
	SpotlightNew,
} from "@/client/landing/ui";
import {
	ArrowRight,
	ArrowUpRightFromSquare,
	CircleCheckFill,
	Sparkles,
} from "@gravity-ui/icons";
import { buttonVariants, Card, Chip, Link } from "@heroui/react";
import { cn } from "@itsrose/react/core";
import { memo } from "react";

const HERO_WORDS = [
	"Media APIs",
	"AI Vision Studio",
	"Neural Voice AI",
	"Character Agents",
	"Social Scrapers",
];

export const LandingHero = memo(() => {
	return (
		<section className="relative w-full pt-12 pb-8 md:pt-16 md:pb-16 flex flex-col items-center text-center overflow-hidden">
			{/* Ambient Multi-Angle Spotlight Glow with Parallax */}
			<SpotlightNew />

			{/* Announcement Badge */}
			<InViewReveal delay={0.1}>
				<div className="relative z-10 mb-6 inline-flex items-center gap-2">
					<Chip
						variant="soft"
						className="bg-accent/15 text-foreground font-medium border border-accent/30 py-1 px-3.5"
					>
						<span className="flex items-center gap-1.5 text-xs sm:text-sm">
							<Sparkles className="size-3.5 text-accent shrink-0" />
							<span>ItsRose 2.0 Engine is Live</span>
						</span>
					</Chip>
				</div>
			</InViewReveal>

			{/* Main Dynamic Headline */}
			<InViewReveal
				delay={0.2}
				className="relative z-10 max-w-4xl space-y-4"
			>
				<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.15]">
					Unified AI Vision, Voice &amp;
					<br />
					<FlipWords words={HERO_WORDS} className="font-bold" />
				</h1>
				<p className="text-base sm:text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed pt-2">
					Build production-ready applications with enterprise computer
					vision, ultra-realistic voice synthesis, conversational
					personas, and watermark-free media extraction under a single
					unified API.
				</p>
			</InViewReveal>

			{/* CTA Actions */}
			<InViewReveal
				delay={0.3}
				className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4"
			>
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
					Start Building for Free
					<Link.Icon>
						<ArrowRight className="size-4" />
					</Link.Icon>
				</Link>
				<Link
					href="/resource/api-reference"
					className={cn(
						"gap-2 font-medium",
						buttonVariants({
							variant: "outline",
							size: "lg",
						})
					)}
				>
					Explore API Reference
					<Link.Icon>
						<ArrowUpRightFromSquare className="size-4" />
					</Link.Icon>
				</Link>
			</InViewReveal>

			{/* Trust / Feature Checklist */}
			<InViewReveal
				delay={0.4}
				className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted"
			>
				<div className="flex items-center gap-1.5">
					<CircleCheckFill className="size-4 text-success" />
					<span>Instant API Key Generation</span>
				</div>
				<div className="flex items-center gap-1.5">
					<CircleCheckFill className="size-4 text-success" />
					<span>Generous Free Tier Included</span>
				</div>
				<div className="flex items-center gap-1.5">
					<CircleCheckFill className="size-4 text-success" />
					<span>OpenAPI 3.1 &amp; TypeScript SDK</span>
				</div>
			</InViewReveal>

			{/* 3D Perspective Scroll Container with Live Code Card */}
			<div className="relative z-10 mt-10 w-full max-w-5xl">
				<ContainerScroll>
					<Card className="border border-border/80 bg-surface shadow-2xl">
						<Card.Header className="flex flex-row items-center justify-between border-b border-border/50 pb-3">
							<div className="flex items-center gap-2">
								<div className="flex gap-1.5">
									<span className="size-2.5 bg-danger/70 block" />
									<span className="size-2.5 bg-warning/70 block" />
									<span className="size-2.5 bg-success/70 block" />
								</div>
								<span className="text-xs font-mono text-muted ml-2">
									POST /clothes_segmentation
								</span>
							</div>
							<div className="flex items-center gap-2">
								<Chip
									variant="soft"
									className="bg-success/15 text-success text-[11px] font-mono py-0.5"
								>
									200 OK
								</Chip>
								<span className="text-xs font-mono text-muted hidden sm:inline">
									38.4 ms
								</span>
							</div>
						</Card.Header>
						<Card.Content className="p-4 sm:p-6 font-mono text-xs sm:text-sm overflow-x-auto bg-surface-secondary/40 text-left">
							<div className="space-y-3">
								<div className="text-muted">
									<span className="text-accent font-semibold">
										curl
									</span>{" "}
									-X POST
									https://api.itsrose.net/clothes_segmentation
									\
									<br />
									&nbsp;&nbsp;-H{" "}
									<span className="text-foreground">
										&quot;Authorization: Bearer
										itsrose_live_sk_...&quot;
									</span>{" "}
									\<br />
									&nbsp;&nbsp;-H{" "}
									<span className="text-foreground">
										&quot;Content-Type:
										application/json&quot;
									</span>{" "}
									\<br />
									&nbsp;&nbsp;-d &apos;
									<span className="text-foreground">
										{JSON.stringify({
											init_image:
												"https://assets.itsrose.net/demo/model.jpg",
										})}
									</span>
									&apos;
								</div>
								<div className="pt-2 border-t border-border/40 text-foreground">
									<p className="text-xs text-muted mb-1 font-sans">
										// Response JSON
									</p>
									<pre className="text-xs sm:text-sm leading-relaxed text-foreground">
										{JSON.stringify(
											{
												ok: true,
												code: 0,
												message: "ok",
												data: {
													segmentation_mask: [
														"https://example.com/image.png",
													],
													labels: [
														{
															label: "dress",
															n_label: "1",
															url: "https://example.com/image.png",
														},
														{
															label: "shoes",
															n_label: "1",
															url: "https://example.com/image.png",
														},
													],
												},
												errors: null,
												meta: {},
											},
											null,
											2
										)}
									</pre>
								</div>
							</div>
						</Card.Content>
					</Card>
				</ContainerScroll>
			</div>

			{/* Platform Metrics Grid */}
			<InViewReveal
				delay={0.2}
				className="relative z-10 mt-4 w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-4"
			>
				<Card className="border border-border/60 bg-surface/60 p-4 text-center">
					<Card.Content className="p-0 flex flex-col items-center justify-center gap-1">
						<span className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
							&lt; 45ms
						</span>
						<span className="text-xs sm:text-sm text-muted font-medium">
							Edge Latency
						</span>
					</Card.Content>
				</Card>

				<Card className="border border-border/60 bg-surface/60 p-4 text-center">
					<Card.Content className="p-0 flex flex-col items-center justify-center gap-1">
						<span className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
							99.99%
						</span>
						<span className="text-xs sm:text-sm text-muted font-medium">
							Uptime SLA
						</span>
					</Card.Content>
				</Card>

				<Card className="border border-border/60 bg-surface/60 p-4 text-center">
					<Card.Content className="p-0 flex flex-col items-center justify-center gap-1">
						<span className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
							15+
						</span>
						<span className="text-xs sm:text-sm text-muted font-medium">
							AI Engines
						</span>
					</Card.Content>
				</Card>

				<Card className="border border-border/60 bg-surface/60 p-4 text-center">
					<Card.Content className="p-0 flex flex-col items-center justify-center gap-1">
						<span className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
							10M+
						</span>
						<span className="text-xs sm:text-sm text-muted font-medium">
							Monthly Requests
						</span>
					</Card.Content>
				</Card>
			</InViewReveal>
		</section>
	);
});

LandingHero.displayName = "LandingHero";
