import type { VoiceSettings } from "../api/types";

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
	stability: 0.5,
	similarity_boost: 0.75,
	style: 0.0,
	speed: 1.0,
	use_speaker_boost: true,
};

export type VoiceSettingPresetKey =
	"natural" | "narration" | "expressive" | "fast";

export const VOICE_SETTING_PRESETS: Record<
	VoiceSettingPresetKey,
	{ label: string; description: string; settings: VoiceSettings }
> = {
	natural: {
		label: "Natural & Balanced",
		description: "Standard conversational balance for all-round speech.",
		settings: {
			stability: 0.5,
			similarity_boost: 0.75,
			style: 0.0,
			speed: 1.0,
			use_speaker_boost: true,
		},
	},
	narration: {
		label: "Audiobook Narration",
		description:
			"Consistent, articulate pacing ideal for long-form reading.",
		settings: {
			stability: 0.7,
			similarity_boost: 0.8,
			style: 0.15,
			speed: 0.95,
			use_speaker_boost: true,
		},
	},
	expressive: {
		label: "Expressive & Dramatic",
		description: "Higher emotional variability and stylistic flair.",
		settings: {
			stability: 0.35,
			similarity_boost: 0.7,
			style: 0.45,
			speed: 1.0,
			use_speaker_boost: true,
		},
	},
	fast: {
		label: "Energetic & Fast",
		description: "Upbeat tempo for ads, teasers, and social media reels.",
		settings: {
			stability: 0.55,
			similarity_boost: 0.75,
			style: 0.2,
			speed: 1.15,
			use_speaker_boost: true,
		},
	},
};

export type SamplePrompt = {
	id: string;
	title: string;
	category: string;
	text: string;
};

export const SAMPLE_PROMPTS: SamplePrompt[] = [
	{
		id: "narration",
		title: "Audiobook",
		category: "Literature",
		text: "In the quiet corners of the ancient library, dusty tomes whispered secrets of civilizations long forgotten by time.",
	},
	{
		id: "commercial",
		title: "Commercial",
		category: "Marketing",
		text: "Introducing the next generation of sound. Crystal clear, ultra-responsive, and tailored to perfection. Experience the revolution today.",
	},
	{
		id: "dialogue",
		title: "Dialogue",
		category: "Character",
		text: "Wait, you actually thought we wouldn't notice? The clues were everywhere, right in plain sight!",
	},
	{
		id: "motivational",
		title: "Motivational",
		category: "Speech",
		text: "Every great achievement was once considered impossible. Believe in your vision, stay relentless, and make your mark on the world.",
	},
	{
		id: "podcast",
		title: "Podcast Intro",
		category: "Media",
		text: "Welcome back to the studio. Today, we're diving deep into the neural frontiers shaping modern voice synthesis and intelligence.",
	},
];
