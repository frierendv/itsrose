"use client";

import { CardSpotlight } from "@/components/ui/card-spotlight";
import {
	Check,
	Globe,
	Lock,
	Pulse,
	Sliders,
	Terminal,
} from "@gravity-ui/icons";
import { useState } from "react";

const REGIONS = [
	{ name: "Tokyo (ap-northeast-1)", ping: "18ms", status: "Optimal" },
	{ name: "Frankfurt (eu-central-1)", ping: "24ms", status: "Optimal" },
	{ name: "San Jose (us-west-1)", ping: "31ms", status: "Optimal" },
	{ name: "Singapore (ap-southeast-1)", ping: "22ms", status: "Optimal" },
];

export function BentoFeatures() {
	const [activeRegion, setActiveRegion] = useState(0);

	return (
		<section
			id="features"
			aria-labelledby="features-heading"
			className="border-border/60 border-b py-20 lg:py-28"
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Section Header (Left-aligned, structured) */}
				<div className="flex flex-col items-start text-left">
					<div className="inline-flex items-center gap-2 border border-border bg-surface px-2.5 py-1 text-xs">
						<span className="size-1.5 rounded-full bg-accent" />
						<span className="font-semibold text-accent uppercase tracking-wider">
							Core Engineering
						</span>
					</div>
					<h2
						id="features-heading"
						className="mt-4 font-bold text-3xl text-foreground tracking-tight sm:text-4xl"
					>
						Engineered for Ultra-Low Latency & Absolute Privacy.
					</h2>
					<p className="mt-3 max-w-2xl text-base text-muted leading-relaxed">
						Every endpoint is designed to eliminate cold starts,
						insulate your sensitive customer payloads, and provide
						unmatched developer ergonomics.
					</p>
				</div>

				{/* Asymmetric Bento Grid */}
				<div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{/* Card 1: Multi-Region Edge Routing (Spans 2 columns) */}
					<CardSpotlight className="flex flex-col justify-between p-6 lg:col-span-2">
						<div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Globe className="size-5 text-accent" />
									<span className="font-mono text-muted text-xs uppercase tracking-wider">
										Distributed Fabric
									</span>
								</div>
								<span className="inline-flex items-center gap-1 font-mono text-accent text-xs">
									<Pulse className="size-3" />
									Active Anycast
								</span>
							</div>

							<h3 className="mt-4 font-bold text-foreground text-xl">
								Sub-50ms Global Edge Routing
							</h3>
							<p className="mt-2 text-muted text-sm leading-relaxed">
								Requests hit our closest Anycast edge gateway
								within single-digit milliseconds, routing
								through isolated GPU worker clusters across 4
								continents.
							</p>

							{/* Interactive Regional Probe Visualizer */}
							<div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
								{REGIONS.map((region, idx) => (
									<button
										key={region.name}
										type="button"
										onClick={() => setActiveRegion(idx)}
										className={`flex items-center justify-between border p-3 text-left transition-colors ${
											activeRegion === idx
												? "border-accent bg-accent/10"
												: "border-border bg-surface-secondary/50 hover:border-border/80"
										}`}
									>
										<div>
											<div className="font-medium text-foreground text-xs">
												{region.name}
											</div>
											<div className="mt-1 font-mono text-[11px] text-muted">
												Route: Direct TLS Edge
											</div>
										</div>
										<div className="text-right">
											<div className="font-bold font-mono text-accent text-xs">
												{region.ping}
											</div>
											<div className="text-[10px] text-muted">
												{region.status}
											</div>
										</div>
									</button>
								))}
							</div>
						</div>

						<div className="mt-6 flex items-center justify-between border-border border-t pt-4 text-muted text-xs">
							<span>Automatic geo-affinity balancing</span>
							<span className="font-mono">
								TCP / HTTP 3.0 QUIC
							</span>
						</div>
					</CardSpotlight>

					{/* Card 2: Ephemeral Zero-Retention Privacy */}
					<CardSpotlight className="flex flex-col justify-between p-6">
						<div>
							<div className="flex items-center gap-2">
								<Lock className="size-5 text-accent" />
								<span className="font-mono text-muted text-xs uppercase tracking-wider">
									Privacy Guarantee
								</span>
							</div>

							<h3 className="mt-4 font-bold text-foreground text-xl">
								Zero-Retention In-Memory Core
							</h3>
							<p className="mt-2 text-muted text-sm leading-relaxed">
								Customer inputs and media payloads are processed
								ephemerally in volatile RAM. Nothing is saved to
								persistent disks, and your private data is never
								used to train models.
							</p>

							<ul className="mt-6 space-y-2.5 text-xs">
								{[
									"In-memory RAM execution only",
									"Never used for public model training",
									"AES-256 encrypted authentication keys",
									"Strict GDPR & CCPA compliance",
								].map((item) => (
									<li
										key={item}
										className="flex items-center gap-2 text-foreground/90"
									>
										<Check className="size-3.5 text-accent" />
										<span>{item}</span>
									</li>
								))}
							</ul>
						</div>

						<div className="mt-6 border-border border-t pt-4 font-mono text-[11px] text-muted">
							Security Policy: Ephemeral TTL = 0s
						</div>
					</CardSpotlight>

					{/* Card 3: Adaptive Rate Shields & Concurrency */}
					<CardSpotlight className="flex flex-col justify-between p-6">
						<div>
							<div className="flex items-center gap-2">
								<Sliders className="size-5 text-accent" />
								<span className="font-mono text-muted text-xs uppercase tracking-wider">
									Reliability
								</span>
							</div>

							<h3 className="mt-4 font-bold text-foreground text-xl">
								Adaptive Rate Shields
							</h3>
							<p className="mt-2 text-muted text-sm leading-relaxed">
								Gracefully manage traffic surges with automatic
								burst queuing, token-bucket throttling, and
								circuit-breaker protections.
							</p>

							{/* Simulated Rate Meter */}
							<div className="mt-6 space-y-3 border border-border bg-surface-secondary/40 p-3">
								<div className="flex justify-between text-xs">
									<span className="text-muted">
										Burst Quota:
									</span>
									<span className="font-mono text-accent">
										1,200 req/sec
									</span>
								</div>
								<div className="h-1.5 w-full bg-border">
									<div className="h-1.5 w-3/4 bg-accent" />
								</div>
								<div className="flex justify-between text-[11px] text-muted">
									<span>Status: Normal</span>
									<span>Backoff: Exponential</span>
								</div>
							</div>
						</div>

						<div className="mt-6 border-border border-t pt-4 font-mono text-[11px] text-muted">
							HTTP 429 Prevention: Active
						</div>
					</CardSpotlight>

					{/* Card 4: End-to-End Type Safety & SDK (Spans 2 columns) */}
					<CardSpotlight className="flex flex-col justify-between p-6 lg:col-span-2">
						<div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Terminal className="size-5 text-accent" />
									<span className="font-mono text-muted text-xs uppercase tracking-wider">
										Developer Ergonomics
									</span>
								</div>
								<span className="font-mono text-muted text-xs">
									OpenAPI 3.1 &bull; Zod Schemas
								</span>
							</div>

							<h3 className="mt-4 font-bold text-foreground text-xl">
								Type-Safe SDKs for Modern Stacks
							</h3>
							<p className="mt-2 text-muted text-sm leading-relaxed">
								Whether building with Next.js, FastAPI, or
								Node.js microservices, our official SDKs give
								you compile-time type validation, auto-complete,
								and built-in Server-Sent Event (SSE) streaming
								handles.
							</p>

							<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
								<div className="border border-border bg-surface-secondary/40 p-3">
									<div className="font-semibold text-foreground text-xs">
										Full Type Safety
									</div>
									<div className="mt-1 text-muted text-[11px]">
										Compile-time validation on all request
										bodies & response payloads.
									</div>
								</div>
								<div className="border border-border bg-surface-secondary/40 p-3">
									<div className="font-semibold text-foreground text-xs">
										Native Streaming
									</div>
									<div className="mt-1 text-muted text-[11px]">
										Async SSE iterators for generation
										progress & long tasks.
									</div>
								</div>
								<div className="border border-border bg-surface-secondary/40 p-3">
									<div className="font-semibold text-foreground text-xs">
										Auto-Retries
									</div>
									<div className="mt-1 text-muted text-[11px]">
										Smart jitter backoff on network dropouts
										and edge failovers.
									</div>
								</div>
							</div>
						</div>

						<div className="mt-6 flex items-center justify-between border-border border-t pt-4 text-muted text-xs">
							<span>
								Official Packages: @itsrose/react &bull;
								@itsrose/node
							</span>
							<span className="font-mono">ESM & CJS Ready</span>
						</div>
					</CardSpotlight>
				</div>
			</div>
		</section>
	);
}
