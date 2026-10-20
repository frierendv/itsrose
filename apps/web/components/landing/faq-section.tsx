"use client";

import { ChevronDown, CircleQuestion } from "@gravity-ui/icons";
import { Accordion } from "@heroui/react";

const FAQ_ITEMS = [
	{
		title: "What is ItsRose, and how does it fit into my architecture?",
		content:
			"ItsRose is a API platform. Instead of deploying, managing, and paying for multiple fragmented providers, ItsRose gives you a single API key, consistent SDK, and edge-routed infrastructure with sub-50ms latency.",
	},
	{
		title: "What is your data retention policy? Do you train on user inputs?",
		content:
			"We enforce a strict zero-retention policy. All customer API payloads—including uploaded images, text prompts, audio buffers, and extracted documents—are processed ephemerally in volatile memory (RAM). Nothing is stored to persistent databases or disks, and your private data is never used to train public models.",
	},
	{
		title: "How do API credits work?",
		content:
			"Credits are metered per compute operation based on complexity. For instance, high-precision OCR extraction or web scraping costs 1 credit, while photorealistic FLUX.1 generation costs 2 credits. On paid Pro plans, unused credits roll over to the subsequent billing month.",
	},
	{
		title: "How do I authenticate API calls and rotate secret keys?",
		content:
			"Authentication uses standard HTTP Bearer tokens (e.g. `Authorization: Bearer rose_live_...`). You can create separate scoped tokens with per-environment IP restrictions and instant one-click revocation from your developer dashboard.",
	},
	{
		title: "Does ItsRose support streaming responses (SSE)?",
		content:
			"Yes. For generative diffusion, large document OCR, and audio synthesis, our endpoints support Server-Sent Events (SSE). You can listen to real-time execution steps, progress percentages, and intermediate artifacts directly through the official `@itsrose/react` or Python SDKs.",
	},
	{
		title: "Can I request custom rate limits or dedicated infrastructure?",
		content:
			"Yes. Enterprise tiers offer dedicated, reserved GPU clusters with custom model weights, private VPC peering, bespoke SLAs (up to 99.99%), and custom billing terms.",
	},
];

export function FaqSection() {
	return (
		<section
			id="faq"
			aria-labelledby="faq-heading"
			className="border-border/60 border-b py-20 lg:py-28"
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
					{/* Left Column (Structured, not centered) */}
					<div className="flex flex-col items-start text-left lg:col-span-5">
						<div className="inline-flex items-center gap-2 border border-border bg-surface px-2.5 py-1 text-xs">
							<CircleQuestion className="size-3.5 text-accent" />
							<span className="font-semibold text-accent uppercase tracking-wider">
								Frequently Asked
							</span>
						</div>

						<h2
							id="faq-heading"
							className="mt-4 font-bold text-3xl text-foreground tracking-tight sm:text-4xl"
						>
							Got questions? We've got answers.
						</h2>
						<p className="mt-3 text-base text-muted leading-relaxed">
							Everything you need to know about our edge platform,
							ephemeral privacy guarantees, and billing structure.
						</p>

						<div className="mt-8 border border-border bg-surface p-4">
							<div className="font-semibold text-foreground text-sm">
								Need custom assistance?
							</div>
							<p className="mt-1 text-muted text-xs leading-relaxed">
								Our engineering team is active on Discord and
								ready to assist with custom architecture, volume
								benchmarks, and integration support.
							</p>
						</div>
					</div>

					{/* Right Column: HeroUI Accordion */}
					<div className="lg:col-span-7">
						<Accordion className="w-full space-y-3">
							{FAQ_ITEMS.map((item, idx) => (
								<Accordion.Item
									key={idx}
									className="border border-border bg-surface px-5 py-2 transition-colors hover:border-accent/40"
								>
									<Accordion.Heading>
										<Accordion.Trigger className="flex w-full items-center justify-between py-3 text-left font-semibold text-foreground text-sm sm:text-base">
											<span>{item.title}</span>
											<Accordion.Indicator className="ml-4 transition-transform duration-200">
												<ChevronDown className="size-4 text-muted" />
											</Accordion.Indicator>
										</Accordion.Trigger>
									</Accordion.Heading>
									<Accordion.Panel>
										<Accordion.Body className="pt-1 pb-4 text-muted text-xs leading-relaxed sm:text-sm">
											{item.content}
										</Accordion.Body>
									</Accordion.Panel>
								</Accordion.Item>
							))}
						</Accordion>
					</div>
				</div>
			</div>
		</section>
	);
}
