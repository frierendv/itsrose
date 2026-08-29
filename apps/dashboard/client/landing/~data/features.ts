import { Camera, Filmstrip, Microphone, Person } from "@gravity-ui/icons";
import type React from "react";

export type FeatureEndpoint = {
	name: string;
	desc: string;
	method: "POST" | "GET";
	path: string;
	tag: string;
};

export type FeaturePillar = {
	id: string;
	badge: string;
	title: string;
	tagline: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	accentColor: string;
	endpoints: FeatureEndpoint[];
	preview: {
		type: "mask" | "audio" | "chat" | "scraper";
		title: string;
		subtitle: string;
		tags: string[];
	};
};

export const FEATURE_PILLARS: FeaturePillar[] = [
	{
		id: "vision",
		badge: "Computer Vision",
		title: "AI Vision & Image Studio",
		tagline:
			"High-precision image synthesis, fashion AI, and photo restoration",
		description:
			"State-of-the-art computer vision models powered by MTXX & Remini architectures for pixel-perfect segmentation, style transfer, and generative canvas outpainting.",
		icon: Camera,
		accentColor: "accent",
		endpoints: [
			{
				name: "Clothes Segmentation",
				desc: "Isolate garments, footwear, and accessories with automatic mask and category classification.",
				method: "POST",
				path: "/clothes_segmentation",
				tag: "POST /clothes_segmentation",
			},
			{
				name: "Versatile Hairstyle Transfer",
				desc: "Generate and switch diverse hairstyles, textures, and coloring on portraits.",
				method: "POST",
				path: "/versatile_hairstyle",
				tag: "POST /versatile_hairstyle",
			},
			{
				name: "Facial Expression Synthesis",
				desc: "Modify facial emotions and expressions with photorealistic fidelity.",
				method: "POST",
				path: "/expression_generation",
				tag: "POST /expression_generation",
			},
			{
				name: "AI Image Restoration & Upscaling",
				desc: "Recover degraded, blurry, or vintage images with deep neural restoration.",
				method: "POST",
				path: "/image_restoration",
				tag: "POST /image_restoration",
			},
			{
				name: "Studio Background Removal",
				desc: "Instant cutout with precision edge and alpha matte detection.",
				method: "POST",
				path: "/remove_bg",
				tag: "POST /remove_bg",
			},
			{
				name: "Generative Outpainting",
				desc: "Seamlessly expand canvas boundaries with context-aware generative fill.",
				method: "POST",
				path: "/outpainting",
				tag: "POST /outpainting",
			},
		],
		preview: {
			type: "mask",
			title: "Pixel-Perfect Segmentation",
			subtitle: "99.4% mask confidence on apparel & portraits",
			tags: ["Mask Generator", "Label Classification", "Auto-Crop"],
		},
	},
	{
		id: "voice",
		badge: "Audio Intelligence",
		title: "Neural Voice & Speech Synthesis",
		tagline:
			"Ultra-realistic multilingual voiceovers, dialogue & instant cloning",
		description:
			"Enterprise audio generation powered by ElevenLabs neural models for lifelike, emotionally nuanced voice experiences with sub-second generation times.",
		icon: Microphone,
		accentColor: "accent",
		endpoints: [
			{
				name: "Text-to-Speech (TTS)",
				desc: "Convert text to ultra-realistic speech across 30+ languages with custom voice presets.",
				method: "POST",
				path: "/elevenlabs/text-to-speech",
				tag: "POST /elevenlabs/text-to-speech",
			},
			{
				name: "Speech-to-Speech (STS)",
				desc: "Transform voice recordings into different speaker identities while maintaining intonation.",
				method: "POST",
				path: "/elevenlabs/speech-to-speech",
				tag: "POST /elevenlabs/speech-to-speech",
			},
			{
				name: "Text-to-Dialogue Engine",
				desc: "Multi-speaker conversational dialogue generation for podcasts, audiobooks, and scripts.",
				method: "POST",
				path: "/elevenlabs/text-to-dialogue",
				tag: "POST /elevenlabs/text-to-dialogue",
			},
			{
				name: "Instant Voice Cloning (IVC)",
				desc: "Synthesize bespoke voice clones from short audio samples with minimal training time.",
				method: "POST",
				path: "/elevenlabs/create-ivc-voice",
				tag: "POST /elevenlabs/create-ivc-voice",
			},
		],
		preview: {
			type: "audio",
			title: "Multilingual Neural Engine",
			subtitle: "30+ languages • 48kHz studio audio output",
			tags: ["ElevenLabs Engine", "Zero-Shot IVC", "Multi-Speaker"],
		},
	},
	{
		id: "character",
		badge: "Conversational AI",
		title: "Interactive Personas & Agents",
		tagline:
			"Discover thousands of dynamic AI characters with memory & context",
		description:
			"Tap into expansive character personas powered by Character.AI engines for interactive roleplay, autonomous assist agents, and rich storytelling.",
		icon: Person,
		accentColor: "accent",
		endpoints: [
			{
				name: "Character Explorer & Discovery",
				desc: "Search through thousands of public and curated interactive character personas.",
				method: "POST",
				path: "/character_ai/search_character",
				tag: "POST /character_ai/search_character",
			},
			{
				name: "Contextual Multi-Turn Chat",
				desc: "Maintain conversational history, dynamic personality prompts, and continuous context.",
				method: "POST",
				path: "/character_ai/send_message",
				tag: "POST /character_ai/send_message",
			},
		],
		preview: {
			type: "chat",
			title: "Stateful Persona Engine",
			subtitle: "Long-term context memory & roleplay personas",
			tags: ["Character.AI", "Streaming Chat", "Dynamic Prompts"],
		},
	},
	{
		id: "extractors",
		badge: "Media Scraping",
		title: "Social Media Scrapers & Extractors",
		tagline:
			"Lightning-fast, watermark-free media extraction for TikTok & Instagram",
		description:
			"High-speed, resilient media downloaders and metadata extractors built for content creators, automation bots, and data intelligence pipelines.",
		icon: Filmstrip,
		accentColor: "accent",
		endpoints: [
			{
				name: "TikTok HD Media Extractor",
				desc: "Extract watermark-free HD videos, audio tracks, and slide decks in real-time.",
				method: "POST",
				path: "/tiktok/get_content",
				tag: "POST /tiktok/get_content",
			},
			{
				name: "Instagram Post & Reels Extractor",
				desc: "Download Instagram reels, stories, carousel posts, and comprehensive media metadata.",
				method: "POST",
				path: "/instagram/get_media",
				tag: "POST /instagram/get_media",
			},
		],
		preview: {
			type: "scraper",
			title: "Lossless High-Speed Extraction",
			subtitle: "No watermarks • Direct CDN media links",
			tags: ["TikTok No-WM", "Instagram Reels", "Direct CDN"],
		},
	},
];
