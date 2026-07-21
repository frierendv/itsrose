import { z } from "zod/v4";

const VoiceSchema = z.object({
	voice_id: z.string().describe("Unique identifier for the voice."),
	name: z.string().describe("Display name of the voice."),
	samples: z
		.array(z.record(z.string(), z.any()))
		.nullable()
		.describe("Audio samples associated with this voice."),
	category: z
		.enum(["generated", "cloned", "premade", "professional"])
		.nullable()
		.describe("Category of the voice."),
	fine_tuning: z
		.record(z.string(), z.any())
		.nullable()
		.describe("Fine-tuning status and configuration for this voice."),
	labels: z
		.record(z.string(), z.string())
		.describe("Arbitrary key-value labels attached to the voice."),
	description: z
		.string()
		.nullable()
		.describe("Human-readable description of the voice."),
	preview_url: z
		.string()
		.nullable()
		.describe("URL to a short audio preview of the voice."),
	available_for_tiers: z
		.array(z.string())
		.describe("Subscription tiers that have access to this voice."),
	settings: z
		.record(z.string(), z.any())
		.nullable()
		.describe("Default generation settings for this voice."),
	sharing: z
		.record(z.string(), z.any())
		.nullable()
		.describe(
			"Sharing configuration if the voice is published to the library."
		),
	high_quality_base_model_ids: z
		.array(z.string())
		.describe("Model IDs for which high-quality audio is available."),
	verified_languages: z
		.array(z.record(z.string(), z.any()))
		.describe("Languages that have been verified for this voice."),
	collection_ids: z
		.array(z.string())
		.describe("IDs of collections this voice belongs to."),
	safety_control: z
		.enum(["NONE", "BAN", "CAPTCHA", "CAPTCHA_AND_MODERATION"])
		.nullable()
		.describe("Safety control level applied to this voice."),
	voice_verification: z
		.record(z.string(), z.any())
		.nullable()
		.describe("Verification state and history for this voice."),
	permission_on_resource: z
		.string()
		.nullable()
		.describe("Permission level the current user has on this voice."),
	is_owner: z
		.boolean()
		.nullable()
		.describe("Whether the current user owns this voice."),
	is_legacy: z
		.boolean()
		.nullable()
		.describe("Whether this is a legacy voice from a prior system."),
	is_mixed: z
		.boolean()
		.nullable()
		.describe("Whether this voice was created by mixing other voices."),
	favorited_at_unix: z
		.number()
		.int()
		.nullable()
		.describe("Unix timestamp of when the user favorited this voice."),
	created_at_unix: z
		.number()
		.int()
		.nullable()
		.describe("Unix timestamp of when the voice was created."),
	is_bookmarked: z
		.boolean()
		.nullable()
		.describe("Whether the current user has bookmarked this voice."),
	recording_quality: z
		.enum(["studio", "high", "medium", "low"])
		.nullable()
		.describe("Assessed quality level of the voice recordings."),
	labelling_status: z
		.enum(["in_review", "labelled", "unlabelled"])
		.nullable()
		.describe("Status of the voice labelling process."),
	recording_quality_reason: z
		.string()
		.nullable()
		.describe("Explanation for the assigned recording quality level."),
});

// ── Top-level response ───────────────────────────────────────────────────────

export const ElevenLabsListVoicesResponseSchema = z
	.object({
		voices: z
			.array(VoiceSchema)
			.describe("The list of voices matching the query."),
		has_more: z
			.boolean()
			.describe(
				"Whether more voices are available in subsequent pages. Use with next_page_token for reliable pagination."
			),
		total_count: z
			.number()
			.int()
			.describe(
				"Total number of voices matching the query. This is a live snapshot and may change between requests; prefer has_more for pagination."
			),
		next_page_token: z
			.string()
			.nullable()
			.describe(
				"Token to pass to the next request to retrieve the next page. Null when no more results exist."
			),
	})
	.meta({
		id: "ElevenLabsVoices",
	});

export interface IElevenLabsListVoicesResponse extends z.infer<
	typeof ElevenLabsListVoicesResponseSchema
> {}
