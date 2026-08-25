"use client";

import { ARCHITECTURE_FEATURES } from "@/client/landing/~data";
import { CardSpotlight, InViewReveal } from "@/client/landing/ui";
import { Card, Chip } from "@heroui/react";
import { memo } from "react";

export const LandingArchitecture = memo(() => {
	return (
		<section className="relative w-full py-12 md:py-20 flex flex-col items-center">
			<InViewReveal className="max-w-3xl text-center space-y-3 mb-12">
				<Chip
					variant="soft"
					className="bg-accent/15 text-foreground font-medium border border-accent/30 py-0.5 px-3"
				>
					<span className="text-xs uppercase tracking-wider font-semibold">
						Architecture &amp; DX
					</span>
				</Chip>
				<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
					Built for Speed, Reliability &amp; Scale
				</h2>
				<p className="text-sm sm:text-base text-muted max-w-xl mx-auto">
					Designed from the ground up to give developers the most
					reliable foundation for AI-native production applications.
				</p>
			</InViewReveal>

			<div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-6">
				{ARCHITECTURE_FEATURES.map((item, index) => {
					const Icon = item.icon;
					return (
						<InViewReveal
							key={item.title}
							delay={index * 0.1}
							className="h-full"
						>
							<CardSpotlight className="h-full">
								<Card className="h-full border border-border/80 bg-surface flex flex-col justify-between shadow-md transition-all duration-300">
									<Card.Header className="pb-2">
										<div className="flex items-center justify-between w-full mb-3">
											<div className="size-10 bg-surface-secondary border border-border/60 text-accent flex items-center justify-center">
												<Icon className="size-5" />
											</div>
											<Chip
												variant="soft"
												className="bg-surface-secondary text-accent text-xs border border-border/40 font-mono"
											>
												{item.tag}
											</Chip>
										</div>
										<Card.Title className="text-lg font-bold text-foreground">
											{item.title}
										</Card.Title>
									</Card.Header>
									<Card.Content>
										<p className="text-sm text-muted leading-relaxed">
											{item.description}
										</p>
									</Card.Content>
									<Card.Footer className="pt-3 border-t border-border/40">
										<div className="flex items-center gap-1.5 text-xs text-muted font-medium">
											<span className="size-1.5 bg-success block" />
											<span>Production Ready</span>
										</div>
									</Card.Footer>
								</Card>
							</CardSpotlight>
						</InViewReveal>
					);
				})}
			</div>
		</section>
	);
});

LandingArchitecture.displayName = "LandingArchitecture";
