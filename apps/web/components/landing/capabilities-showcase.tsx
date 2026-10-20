"use client";

import { CardSpotlight } from "@/components/ui/card-spotlight";
import { ArrowRight, Check, Pulse, Server } from "@gravity-ui/icons";
import { buttonVariants } from "@heroui/styles";
import { AnimatePresence, motion } from "motion/react";
import NextLink from "next/link";
import { useState } from "react";

type CapabilityCategory = "generative" | "vision" | "audio" | "web";

type CapabilityItem = {
	title: string;
	endpoint: string;
	description: string;
	latency: string;
	badge: string;
	features: string[];
	sampleCall: string;
};

const CAPABILITIES_DATA: Record<
	CapabilityCategory,
	{ label: string; description: string; items: CapabilityItem[] }
> = {
	generative: {
		label: "Generative AI",
		description:
			"Sub-second image synthesis, inpainting, and style transfer powered by state-of-the-art diffusion models.",
		items: [
			{
				title: "FLUX.1 Schnell & Dev",
				endpoint: "POST /v2/image/flux-schnell",
				description:
					"State-of-the-art photorealistic text-to-image synthesis with unmatched prompt adherence and typographic detail.",
				latency: "~60ms",
				badge: "Flagship",
				features: [
					"Up to 2048x2048 native rendering",
					"Custom LoRA & guidance weights",
					"Deterministic seed pinning",
				],
				sampleCall: 'client.image.fluxSchnell({ prompt: "..." })',
			},
			{
				title: "SDXL Lightning & Turbo",
				endpoint: "POST /v2/image/sdxl-lightning",
				description:
					"Ultra-high throughput 4-step image synthesis built for high-concurrency production workflows.",
				latency: "~45ms",
				badge: "High-Throughput",
				features: [
					"Sub-50ms execution times",
					"Aspect ratio presets (1:1, 16:9, 9:16)",
					"Integrated negative prompt filtering",
				],
				sampleCall: 'client.image.sdxlLightning({ prompt: "..." })',
			},
			{
				title: "Smart Inpainting & Outpainting",
				endpoint: "POST /v2/image/inpaint",
				description:
					"Seamlessly replace, remove, or expand canvas boundaries using mask-guided conditional diffusion.",
				latency: "~85ms",
				badge: "Precise",
				features: [
					"Alpha mask blending",
					"Edge-aware feathering",
					"High-resolution background fill",
				],
				sampleCall:
					'client.image.inpaint({ image, mask, prompt: "..." })',
			},
		],
	},
	vision: {
		label: "Computer Vision",
		description:
			"Enterprise-grade visual intelligence including deep document OCR, background extraction, and image upscaling.",
		items: [
			{
				title: "Multilingual Document OCR",
				endpoint: "POST /v2/vision/ocr",
				description:
					"Extract structured text, bounding boxes, key-value tables, and confidence scores from scans, receipts, and IDs.",
				latency: "~38ms",
				badge: "Document AI",
				features: [
					"90+ supported languages",
					"Skew & rotation auto-correction",
					"Word & character bounding polygons",
				],
				sampleCall:
					'client.vision.ocr({ imageUrl: "...", languages: ["en"] })',
			},
			{
				title: "Background Removal & Matting",
				endpoint: "POST /v2/vision/remove-bg",
				description:
					"Hair-level precise subject isolation and transparency cutout for e-commerce and profile pictures.",
				latency: "~42ms",
				badge: "E-Commerce",
				features: [
					"Clean alpha channel output (PNG/WebP)",
					"Complex edge & transparent object handling",
					"High-resolution output preservation",
				],
				sampleCall: 'client.vision.removeBg({ imageUrl: "..." })',
			},
			{
				title: "Super-Resolution 4x Upscaling",
				endpoint: "POST /v2/vision/upscale-4x",
				description:
					"Restore blurry, compressed, or low-resolution imagery with generative detail reconstruction.",
				latency: "~70ms",
				badge: "Enhancement",
				features: [
					"Face restoration toggle",
					"JPEG artifact removal",
					"Up to 4096x4096 output scale",
				],
				sampleCall:
					'client.vision.upscale({ imageUrl: "...", scale: 4 })',
			},
		],
	},
	audio: {
		label: "Speech & Audio",
		description:
			"Human-like multilingual text-to-speech synthesis and accurate speech recognition with word-level timestamps.",
		items: [
			{
				title: "Neural Text-to-Speech (TTS)",
				endpoint: "POST /v2/audio/synthesize",
				description:
					"Ultra-realistic speech synthesis with natural cadence, emotional inflections, and pacing control.",
				latency: "~45ms",
				badge: "40+ Voices",
				features: [
					"Multilingual neural voice matrix",
					"Pitch, cadence, and speed adjustment",
					"Streamable raw PCM, MP3, and Opus formats",
				],
				sampleCall:
					'client.audio.synthesize({ text: "...", voice: "aria" })',
			},
			{
				title: "Whisper Speech Transcription",
				endpoint: "POST /v2/audio/transcribe",
				description:
					"Fast, accurate speech-to-text transcription with automatic punctuation, language detection, and speaker diarization.",
				latency: "~95ms",
				badge: "Accurate",
				features: [
					"Word-level timing timestamps",
					"Background noise tolerance",
					"VTT and SRT subtitle export",
				],
				sampleCall: 'client.audio.transcribe({ audioUrl: "..." })',
			},
			{
				title: "Audio Stem Separation",
				endpoint: "POST /v2/audio/stem-separate",
				description:
					"Isolate vocals, drums, bass, and instrumental tracks from any polyphonic audio recording.",
				latency: "~120ms",
				badge: "Studio Tools",
				features: [
					"4-stem isolated audio stems",
					"Zero phase distortion",
					"Lossless WAV output options",
				],
				sampleCall: 'client.audio.separateStems({ audioUrl: "..." })',
			},
		],
	},
	web: {
		label: "Web & Intelligence",
		description:
			"Resilient, headless web crawling, semantic article extraction, and LLM-ready markdown parsing.",
		items: [
			{
				title: "Article & Content Extractor",
				endpoint: "POST /v2/extract/article",
				description:
					"Turn arbitrary messy web articles into clean, semantic markdown or structured JSON without ads and popups.",
				latency: "~52ms",
				badge: "LLM-Ready",
				features: [
					"Automated boilerplate & ad stripping",
					"OpenGraph & metadata extraction",
					"Estimated reading time calculation",
				],
				sampleCall: 'client.extract.article({ url: "..." })',
			},
			{
				title: "Dynamic JavaScript Crawler",
				endpoint: "POST /v2/extract/render-dom",
				description:
					"Execute full headless Chromium browser sessions with anti-bot bypass and screenshot capture.",
				latency: "~110ms",
				badge: "Stealth",
				features: [
					"Bypasses Cloudflare & perimeter firewalls",
					"Custom cookie & header injection",
					"Full page screenshot capture",
				],
				sampleCall: 'client.extract.renderDom({ url: "..." })',
			},
			{
				title: "Web Search Grounding",
				endpoint: "POST /v2/extract/search-ground",
				description:
					"Real-time web search indices with relevant snippet extracts formatted specifically for RAG pipelines.",
				latency: "~65ms",
				badge: "RAG Pipeline",
				features: [
					"Fresh real-time search results",
					"Domain filtering & date scoping",
					"Ranked relevance scores",
				],
				sampleCall: 'client.extract.searchGround({ query: "..." })',
			},
		],
	},
};

export function CapabilitiesShowcase() {
	const [activeCategory, setActiveCategory] =
		useState<CapabilityCategory>("generative");

	const currentData = CAPABILITIES_DATA[activeCategory];

	return (
		<section
			id="capabilities"
			aria-labelledby="capabilities-heading"
			className="border-border/60 border-b py-20 lg:py-28"
		>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{/* Section Header */}
				<div className="flex flex-col items-start text-left">
					<div className="inline-flex items-center gap-2 border border-border bg-surface px-2.5 py-1 text-xs">
						<Server className="size-3.5 text-accent" />
						<span className="font-semibold text-accent uppercase tracking-wider">
							API Catalog
						</span>
					</div>

					<h2
						id="capabilities-heading"
						className="mt-4 font-bold text-3xl text-foreground tracking-tight sm:text-4xl"
					>
						Complete Multimodal Breadth. Single API Key.
					</h2>
					<p className="mt-3 max-w-2xl text-base text-muted leading-relaxed">
						Access generative image models, computer vision
						pipelines, neural voice synthesis, and web extraction
						through one cohesive interface.
					</p>

					{/* Category Selectors */}
					<div className="mt-8 flex flex-wrap gap-2 border-border border-b pb-4">
						{(
							[
								"generative",
								"vision",
								"audio",
								"web",
							] as CapabilityCategory[]
						).map((cat) => (
							<button
								key={cat}
								type="button"
								onClick={() => setActiveCategory(cat)}
								className={`border px-4 py-2 font-medium text-xs transition-colors ${
									activeCategory === cat
										? "border-accent bg-accent/15 font-semibold text-accent"
										: "border-border bg-surface text-muted hover:border-border/80 hover:text-foreground"
								}`}
							>
								{CAPABILITIES_DATA[cat].label}
							</button>
						))}
					</div>
				</div>

				{/* Category Overview */}
				<div className="mt-6 text-left">
					<p className="text-muted text-sm">
						{currentData.description}
					</p>
				</div>

				{/* Cards Grid */}
				<AnimatePresence mode="wait">
					<motion.div
						key={activeCategory}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6 }}
						transition={{ duration: 0.3 }}
						className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
					>
						{currentData.items.map((item) => (
							<CardSpotlight
								key={item.title}
								className="flex flex-col justify-between p-6 text-left"
							>
								<div>
									{/* Top Badges */}
									<div className="flex items-center justify-between">
										<span className="border border-border/80 bg-surface-secondary px-2 py-0.5 font-mono text-[11px] text-accent">
											{item.badge}
										</span>
										<span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted">
											<Pulse className="size-3 text-accent" />
											{item.latency}
										</span>
									</div>

									{/* Endpoint Route */}
									<div className="mt-3 font-mono text-[11px] text-muted truncate">
										{item.endpoint}
									</div>

									{/* Title */}
									<h3 className="mt-2 font-bold text-foreground text-lg">
										{item.title}
									</h3>

									{/* Description */}
									<p className="mt-2 text-muted text-xs leading-relaxed">
										{item.description}
									</p>

									{/* Features List */}
									<ul className="mt-5 space-y-2 border-border/60 border-t pt-4 text-xs">
										{item.features.map((feat) => (
											<li
												key={feat}
												className="flex items-center gap-2 text-foreground/85"
											>
												<Check className="size-3 text-accent" />
												<span>{feat}</span>
											</li>
										))}
									</ul>
								</div>

								{/* Code Snippet Preview & CTA */}
								<div className="mt-6 border-border border-t pt-4">
									<div className="font-mono text-[11px] text-muted truncate">
										{item.sampleCall}
									</div>
									<NextLink
										href="#playground"
										className={buttonVariants({
											variant: "outline",
											size: "sm",
											className:
												"mt-3 w-full justify-between font-medium text-xs",
										})}
									>
										<span>Test in Sandbox</span>
										<ArrowRight className="size-3" />
									</NextLink>
								</div>
							</CardSpotlight>
						))}
					</motion.div>
				</AnimatePresence>
			</div>
		</section>
	);
}
