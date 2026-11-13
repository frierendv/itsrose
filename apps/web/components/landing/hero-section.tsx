"use client";

import { BackgroundBeams } from "@/components/ui/background-beams";
import { GridPattern } from "@/components/ui/grid-pattern";
import { Spotlight } from "@/components/ui/spotlight";
import {
	ArrowRight,
	ArrowsRotateRight,
	Check,
	CircleCheck,
	Copy,
	Play,
	Pulse,
	ShieldCheck,
	Terminal,
} from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { AnimatePresence, motion } from "motion/react";
import NextLink from "next/link";
import { useState } from "react";

type EndpointPreset = {
	id: string;
	name: string;
	method: "POST" | "GET";
	path: string;
	description: string;
	requestBody: Record<string, unknown>;
	responseBody: Record<string, unknown>;
	latency: string;
};

const ENDPOINTS: EndpointPreset[] = [
	{
		id: "vision-ocr",
		name: "Vision OCR",
		method: "POST",
		path: "/v2/vision/ocr",
		description:
			"High-precision text & bounding-box extraction from documents and images.",
		requestBody: {
			image_url: "https://assets.itsrose.net/sample-invoice.png",
			detect_orientation: true,
			languages: ["en", "id", "ja"],
		},
		responseBody: {
			status: "success",
			latency_ms: 38,
			document_type: "receipt",
			detected_language: "en",
			extracted_text: "INVOICE #9201\nTOTAL: $1,450.00 USD\nSTATUS: PAID",
			confidence: 0.998,
		},
		latency: "38ms",
	},
	{
		id: "image-flux",
		name: "FLUX.1 Gen",
		method: "POST",
		path: "/v2/image/flux-schnell",
		description:
			"Sub-second 1024x1024 photorealistic text-to-image synthesis.",
		requestBody: {
			prompt: "Cyberpunk developer workstation with holographic API telemetry, 8k",
			width: 1024,
			height: 1024,
			steps: 4,
			seed: 42891,
		},
		responseBody: {
			status: "success",
			latency_ms: 64,
			dimensions: "1024x1024",
			seed_used: 42891,
			output_url: "https://cdn.itsrose.net/gen/flux_891ac3b.webp",
			model: "flux-schnell-v2.1",
		},
		latency: "64ms",
	},
	{
		id: "audio-tts",
		name: "Neural Audio",
		method: "POST",
		path: "/v2/audio/synthesize",
		description:
			"Ultra-natural speech synthesis across 40+ multilingual voices.",
		requestBody: {
			text: "Welcome to ItsRose. Your API key is authorized and active.",
			voice: "aria-neural-v2",
			speed: 1.05,
			format: "opus",
		},
		responseBody: {
			status: "success",
			latency_ms: 45,
			duration_seconds: 3.2,
			bitrate: "128kbps",
			audio_url: "https://cdn.itsrose.net/audio/speech_210ab.opus",
			waveform_peaks: [0.12, 0.45, 0.88, 0.62, 0.25],
		},
		latency: "45ms",
	},
	{
		id: "extract-article",
		name: "Web Extract",
		method: "POST",
		path: "/v2/extract/article",
		description:
			"Structured markdown extraction and semantic metadata parsing.",
		requestBody: {
			url: "https://news.ycombinator.com/item?id=381920",
			include_markdown: true,
			bypass_cloudflare: true,
		},
		responseBody: {
			status: "success",
			latency_ms: 52,
			title: "ItsRose Architecture: Ephemeral Memory-First API Cloud",
			read_time_minutes: 4,
			markdown_tokens: 1240,
			cached: false,
		},
		latency: "52ms",
	},
];

export function HeroSection() {
	const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointPreset>(
		ENDPOINTS[0]!
	);
	const [isLoading, setIsLoading] = useState(false);
	const [activeTab, setActiveTab] = useState<"response" | "request">(
		"response"
	);
	const [copiedInstall, setCopiedInstall] = useState(false);
	const [copiedResponse, setCopiedResponse] = useState(false);

	const handleSendRequest = () => {
		setIsLoading(true);
		setTimeout(() => {
			setIsLoading(false);
			setActiveTab("response");
		}, 380);
	};

	const handleCopyInstall = () => {
		navigator.clipboard.writeText("pnpm add @itsrose/react");
		setCopiedInstall(true);
		setTimeout(() => setCopiedInstall(false), 2000);
	};

	const handleCopyResponse = () => {
		navigator.clipboard.writeText(
			JSON.stringify(selectedEndpoint.responseBody, null, 2)
		);
		setCopiedResponse(true);
		setTimeout(() => setCopiedResponse(false), 2000);
	};

	return (
		<section
			aria-labelledby="hero-heading"
			className="relative overflow-hidden border-border/60 border-b pt-10 pb-16 lg:pt-16 lg:pb-24"
		>
			<Spotlight className="-top-32 left-10 lg:left-32" />
			<GridPattern
				width={42}
				height={42}
				squares={[
					[2, 3],
					[6, 4],
					[10, 2],
					[14, 5],
					[18, 3],
				]}
			/>
			<BackgroundBeams />

			<div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-8">
					{/* Left Column: Value Proposition & CTAs (Not centered) */}
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: "easeOut" }}
						className="flex flex-col items-start text-left lg:col-span-7"
					>
						{/* Release Badge */}
						<div className="mb-6 inline-flex items-center gap-2 border border-border/80 bg-surface/80 px-3 py-1 backdrop-blur-md">
							<span className="relative flex size-2">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
								<span className="relative inline-flex size-2 rounded-full bg-accent" />
							</span>
							<span className="font-semibold text-accent text-xs">
								ItsRose v2 Platform
							</span>
							<span className="text-border">|</span>
							<span className="text-muted text-xs">
								Global Edge Inference &bull; Sub-50ms Cold
								Starts
							</span>
						</div>

						{/* Primary Heading */}
						<h1
							id="hero-heading"
							className="font-bold text-4xl text-foreground tracking-tight sm:text-5xl lg:text-6xl"
						>
							The Developer Cloud for{" "}
							<span className="bg-linear-to-r from-accent via-accent/80 to-foreground bg-clip-text text-transparent">
								Multimodal AI
							</span>{" "}
							& APIs.
						</h1>

						{/* Subtitle */}
						<p className="mt-6 max-w-2xl text-base text-muted leading-relaxed sm:text-lg">
							Stop juggling fragmented AI providers. ItsRose
							delivers unified, production-grade endpoints for
							computer vision, photorealistic generation, speech
							synthesis, and structured web extraction with
							ephemeral zero-retention privacy.
						</p>

						{/* CTA Buttons */}
						<div className="mt-8 flex flex-wrap items-center gap-4">
							<NextLink
								href="https://dash.itsrose.net/sign-up"
								className={buttonVariants({
									variant: "primary",
									size: "lg",
									className: "font-semibold",
								})}
							>
								Start Free Trial
								<ArrowRight
									className="size-4"
									aria-hidden="true"
								/>
							</NextLink>

							<NextLink
								href="#playground"
								className={buttonVariants({
									variant: "outline",
									size: "lg",
									className: "font-medium",
								})}
							>
								Explore Live Sandbox
							</NextLink>
						</div>

						{/* Quick Install Bar */}
						<div className="mt-8 flex w-full max-w-md items-center justify-between border border-border bg-surface-secondary/70 px-3.5 py-2.5 backdrop-blur-sm">
							<div className="flex items-center gap-2.5 font-mono text-muted text-xs">
								<Terminal
									className="size-4 text-accent"
									aria-hidden="true"
								/>
								<span className="select-all text-foreground">
									pnpm add @itsrose/react
								</span>
							</div>
							<button
								type="button"
								onClick={handleCopyInstall}
								aria-label="Copy install command"
								className="flex size-7 items-center justify-center text-muted transition-colors hover:text-foreground"
							>
								{copiedInstall ? (
									<Check
										className="size-3.5 text-accent"
										aria-hidden="true"
									/>
								) : (
									<Copy
										className="size-3.5"
										aria-hidden="true"
									/>
								)}
							</button>
						</div>

						{/* Technical Feature Trust Badges */}
						<div className="mt-10 grid grid-cols-3 gap-6 border-border/80 border-t pt-6 text-left">
							<div>
								<div className="font-semibold text-foreground text-xl">
									&lt; 42ms
								</div>
								<div className="text-muted text-xs">
									Median P95 Latency
								</div>
							</div>
							<div>
								<div className="font-semibold text-foreground text-xl">
									100%
								</div>
								<div className="text-muted text-xs">
									Ephemeral In-Memory
								</div>
							</div>
							<div>
								<div className="font-semibold text-foreground text-xl">
									99.99%
								</div>
								<div className="text-muted text-xs">
									SLA Availability
								</div>
							</div>
						</div>
					</motion.div>

					{/* Right Column: Live Interactive Sandbox / Request Explorer */}
					<motion.div
						initial={{ opacity: 0, scale: 0.98 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{
							duration: 0.6,
							delay: 0.15,
							ease: "easeOut",
						}}
						className="relative lg:col-span-5"
						id="playground"
					>
						<div className="overflow-hidden border border-border bg-surface shadow-xl">
							{/* Console Top Chrome */}
							<div className="flex items-center justify-between border-border border-b bg-surface-secondary px-4 py-2.5">
								<div className="flex items-center gap-2">
									<div className="size-2.5 rounded-full bg-red-500/70" />
									<div className="size-2.5 rounded-full bg-yellow-500/70" />
									<div className="size-2.5 rounded-full bg-green-500/70" />
									<span className="ml-2 font-mono text-[11px] text-muted">
										itsrose-edge-client v2.4
									</span>
								</div>
								<div className="flex items-center gap-1.5 text-xs">
									<Pulse className="size-3 text-accent" />
									<span className="font-mono text-[11px] text-accent">
										LIVE ENGINE
									</span>
								</div>
							</div>

							{/* Endpoint Preset Tabs */}
							<div className="flex overflow-x-auto border-border border-b bg-surface p-1">
								{ENDPOINTS.map((endpoint) => (
									<button
										key={endpoint.id}
										type="button"
										onClick={() => {
											setSelectedEndpoint(endpoint);
											setIsLoading(false);
										}}
										className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 font-medium text-xs transition-colors ${
											selectedEndpoint.id === endpoint.id
												? "bg-accent/15 font-semibold text-accent"
												: "text-muted hover:text-foreground"
										}`}
									>
										<span>{endpoint.name}</span>
										<span className="font-mono text-[10px] text-muted">
											{endpoint.latency}
										</span>
									</button>
								))}
							</div>

							{/* Route Bar & Action Button */}
							<div className="flex items-center justify-between gap-2 border-border border-b bg-surface-secondary/40 px-4 py-2 text-xs">
								<div className="flex items-center gap-2 font-mono">
									<span className="font-bold text-accent">
										{selectedEndpoint.method}
									</span>
									<span className="truncate text-foreground">
										https://api.itsrose.net
										{selectedEndpoint.path}
									</span>
								</div>
								<Button
									size="sm"
									onPress={handleSendRequest}
									isDisabled={isLoading}
									className="gap-1 font-semibold"
								>
									{isLoading ? (
										<ArrowsRotateRight className="size-3 animate-spin" />
									) : (
										<Play className="size-3" />
									)}
									{isLoading ? "Executing..." : "Send"}
								</Button>
							</div>

							{/* Request & Response Toggle Bar */}
							<div className="flex items-center justify-between border-border border-b bg-surface px-4 py-1.5 text-xs">
								<div className="flex items-center gap-3">
									<button
										type="button"
										onClick={() => setActiveTab("response")}
										className={`font-medium transition-colors ${
											activeTab === "response"
												? "border-accent border-b-2 pb-0.5 text-accent"
												: "text-muted hover:text-foreground"
										}`}
									>
										Response Output
									</button>
									<button
										type="button"
										onClick={() => setActiveTab("request")}
										className={`font-medium transition-colors ${
											activeTab === "request"
												? "border-accent border-b-2 pb-0.5 text-accent"
												: "text-muted hover:text-foreground"
										}`}
									>
										Request Payload
									</button>
								</div>
								<div className="flex items-center gap-2">
									{activeTab === "response" && (
										<>
											<span className="inline-flex items-center gap-1 font-mono text-[11px] text-accent">
												<CircleCheck className="size-3" />
												200 OK
											</span>
											<span className="font-mono text-[11px] text-muted">
												{selectedEndpoint.latency}
											</span>
										</>
									)}
									<button
										type="button"
										onClick={handleCopyResponse}
										aria-label="Copy response JSON"
										className="text-muted hover:text-foreground"
									>
										{copiedResponse ? (
											<Check className="size-3 text-accent" />
										) : (
											<Copy className="size-3" />
										)}
									</button>
								</div>
							</div>

							{/* Terminal Body */}
							<div className="relative min-h-65 max-h-80 overflow-auto bg-surface-tertiary/40 p-4 font-mono text-xs">
								<AnimatePresence mode="wait">
									{isLoading ? (
										<motion.div
											key="loading"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											exit={{ opacity: 0 }}
											className="flex h-56 flex-col items-center justify-center gap-2 text-muted"
										>
											<ArrowsRotateRight className="size-5 animate-spin text-accent" />
											<p className="font-mono text-xs">
												Routing to closest edge node...
											</p>
										</motion.div>
									) : (
										<motion.pre
											key={
												activeTab + selectedEndpoint.id
											}
											initial={{ opacity: 0, y: 4 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0 }}
											className="whitespace-pre-wrap text-foreground/90 leading-relaxed"
										>
											{JSON.stringify(
												activeTab === "response"
													? selectedEndpoint.responseBody
													: selectedEndpoint.requestBody,
												null,
												2
											)}
										</motion.pre>
									)}
								</AnimatePresence>
							</div>

							{/* Console Footer */}
							<div className="flex items-center justify-between border-border border-t bg-surface-secondary px-4 py-2 text-[11px] text-muted">
								<div className="flex items-center gap-1.5">
									<ShieldCheck className="size-3.5 text-accent" />
									<span>
										TLS 1.3 &bull; Ephemeral Execution
									</span>
								</div>
								<span className="font-mono">
									Header: Authorization: Bearer rose_live_***
								</span>
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
