"use client";

import { FEATURE_PILLARS } from "@/client/landing/~data";
import {
	CardSpotlight,
	InViewReveal,
	ParallaxSection,
} from "@/client/landing/ui";
import { ArrowRight, CircleCheckFill } from "@gravity-ui/icons";
import { buttonVariants, Card, Chip, Link } from "@heroui/react";
import { cn } from "@itsrose/react/core";
import { memo } from "react";

export const LandingFeatures = memo(() => {
	return (
		<section
			id="features"
			className="relative w-full py-12 md:py-20 flex flex-col items-center"
		>
			{/* Section Header */}
			<InViewReveal className="max-w-3xl text-center space-y-3 mb-12 sm:mb-16">
				<Chip
					variant="soft"
					className="bg-accent/15 text-foreground font-medium border border-accent/30 py-0.5 px-3"
				>
					<span className="text-xs uppercase tracking-wider font-semibold">
						Engine Capabilities
					</span>
				</Chip>
				<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
					Engineered for Builders, Scale &amp; Precision
				</h2>
				<p className="text-sm sm:text-base text-muted max-w-xl mx-auto">
					Access a comprehensive suite of generative AI and media
					extraction APIs through a single, lightning-fast unified
					gateway.
				</p>
			</InViewReveal>

			{/* Feature Pillars Bento Grid with Staggered In-View & Parallax */}
			<div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
				{FEATURE_PILLARS.map((pillar, index) => {
					const Icon = pillar.icon;
					const isEven = index % 2 === 0;
					return (
						<ParallaxSection
							key={pillar.id}
							offset={isEven ? 15 : -15}
							className="h-full"
						>
							<InViewReveal
								delay={index * 0.12}
								className="h-full"
							>
								<CardSpotlight className="h-full">
									<Card className="h-full border border-border/80 bg-surface flex flex-col justify-between shadow-md transition-all duration-300">
										<Card.Header className="pb-3">
											<div className="flex items-center justify-between w-full mb-3">
												<div className="p-2.5 bg-surface-secondary border border-border/60 text-accent inline-flex items-center justify-center">
													<Icon className="size-5" />
												</div>
												<Chip
													variant="soft"
													className="bg-surface-secondary text-muted text-xs border border-border/50"
												>
													{pillar.badge}
												</Chip>
											</div>
											<Card.Title className="text-xl sm:text-2xl font-bold text-foreground">
												{pillar.title}
											</Card.Title>
											<p className="text-xs font-medium text-accent pt-1">
												{pillar.tagline}
											</p>
											<Card.Description className="text-sm text-muted mt-2 leading-relaxed">
												{pillar.description}
											</Card.Description>
										</Card.Header>

										<Card.Content className="pt-2 flex flex-col gap-3">
											{/* Preview Micro-Banner */}
											<div className="p-3 bg-surface-secondary/70 border border-border/60 flex flex-col gap-1.5">
												<div className="flex items-center justify-between">
													<span className="text-xs font-semibold text-foreground">
														{pillar.preview.title}
													</span>
													<span className="text-[11px] text-muted">
														{
															pillar.preview
																.subtitle
														}
													</span>
												</div>
												<div className="flex flex-wrap gap-1.5 pt-1">
													{pillar.preview.tags.map(
														(tag) => (
															<span
																key={tag}
																className="text-[11px] bg-accent/10 text-foreground border border-accent/20 px-2 py-0.5"
															>
																{tag}
															</span>
														)
													)}
												</div>
											</div>

											{/* Endpoints List */}
											<div className="space-y-2.5 pt-1">
												{pillar.endpoints.map((ep) => (
													<div
														key={ep.name}
														className="p-2.5 bg-surface-secondary/40 border border-border/40 space-y-1"
													>
														<div className="flex flex-wrap items-center justify-between gap-1">
															<div className="flex items-center gap-1.5">
																<CircleCheckFill className="size-3.5 text-success shrink-0" />
																<span className="text-xs font-semibold text-foreground">
																	{ep.name}
																</span>
															</div>
															<code className="text-[10px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 border border-accent/20">
																{ep.tag}
															</code>
														</div>
														<p className="text-[11px] text-muted leading-relaxed pl-5">
															{ep.desc}
														</p>
													</div>
												))}
											</div>
										</Card.Content>

										<Card.Footer className="pt-4 border-t border-border/40">
											<Link
												href="/resource/api-reference"
												className={cn(
													"w-full justify-between text-foreground hover:text-accent font-medium",
													buttonVariants({
														variant: "ghost",
														size: "sm",
													})
												)}
											>
												Explore Endpoints in Docs
												<Link.Icon>
													<ArrowRight className="size-4" />
												</Link.Icon>
											</Link>
										</Card.Footer>
									</Card>
								</CardSpotlight>
							</InViewReveal>
						</ParallaxSection>
					);
				})}
			</div>
		</section>
	);
});

LandingFeatures.displayName = "LandingFeatures";
