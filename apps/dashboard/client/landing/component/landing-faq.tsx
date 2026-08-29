"use client";

import { FAQ_ITEMS } from "@/client/landing/~data";
import { InViewReveal } from "@/client/landing/ui";
import { ChevronDown } from "@gravity-ui/icons";
import { Accordion, Card, Chip, Link } from "@heroui/react";
import { memo } from "react";

export const LandingFaq = memo(() => {
	return (
		<section
			id="faq"
			className="relative w-full py-12 md:py-20 flex flex-col items-center"
		>
			<InViewReveal className="max-w-3xl text-center space-y-3 mb-12">
				<Chip
					variant="soft"
					className="bg-accent/15 text-foreground font-medium border border-accent/30 py-0.5 px-3"
				>
					<span className="text-xs uppercase tracking-wider font-semibold">
						Support &amp; Answers
					</span>
				</Chip>
				<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
					Frequently Asked Questions
				</h2>
				<p className="text-sm sm:text-base text-muted max-w-xl mx-auto">
					Everything you need to know about getting started,
					integrations, billing, and platform architecture.
				</p>
			</InViewReveal>

			<InViewReveal delay={0.15} className="w-full max-w-4xl">
				<Card className="border border-border/80 bg-surface shadow-md">
					<Card.Content className="p-4 sm:p-6">
						<Accordion>
							{FAQ_ITEMS.map((item) => (
								<Accordion.Item
									key={item.id}
									id={item.id}
									className="border-b border-border/40 last:border-b-0 py-2"
								>
									<Accordion.Heading>
										<Accordion.Trigger className="text-sm sm:text-base font-semibold text-foreground hover:text-accent transition-colors flex items-center justify-between w-full py-3 text-left">
											<span>{item.question}</span>
											<Accordion.Indicator>
												<ChevronDown className="size-4 text-muted shrink-0" />
											</Accordion.Indicator>
										</Accordion.Trigger>
									</Accordion.Heading>
									<Accordion.Panel>
										<Accordion.Body className="text-xs sm:text-sm text-muted leading-relaxed pb-4 pt-1">
											{item.answer}
										</Accordion.Body>
									</Accordion.Panel>
								</Accordion.Item>
							))}
						</Accordion>
					</Card.Content>

					<Card.Footer className="border-t border-border/40 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
						<span>
							Have more questions or need enterprise SLAs?
						</span>
						<Link
							href="mailto:support@itsrose.net"
							className="text-accent font-medium hover:underline"
						>
							Contact our team &rarr;
						</Link>
					</Card.Footer>
				</Card>
			</InViewReveal>
		</section>
	);
});

LandingFaq.displayName = "LandingFaq";
