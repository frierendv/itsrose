import { z } from "zod/v4";

/**
 * The nested voice shapes below mirror the ElevenLabs OpenAPI document
 * (`VoiceResponseModel` and the models it references).
 *
 * Two rules keep them honest:
 *
 * - Every documented field is typed, so a wrong-typed value is rejected
 *   instead of travelling through the schema unchecked.
 * - No documented field is *required*. The upstream's own voice payload (the
 *   `VoiceResponseModel` example of the OpenAPI document) omits fields the
 *   document lists as required, so presence is not a signal the upstream
 *   keeps. Every object also keeps the keys the upstream did not document,
 *   through `catchall`, so a field ElevenLabs adds later still reaches the
 *   consumer instead of being dropped by the schema.
 */

const VoiceSpeakerSeparationSchema = z
	.object({
		voice_id: z.string().optional().describe("The ID of the voice."),
		sample_id: z.string().optional().describe("The ID of the sample."),
		status: z
			.enum(["not_started", "pending", "completed", "failed"])
			.optional()
			.describe("The status of the speaker separation."),
		speakers: z
			.record(z.string(), z.unknown())
			.nullish()
			.describe("The speakers of the sample."),
		selected_speaker_ids: z
			.array(z.string())
			.nullish()
			.describe("The IDs of the selected speakers."),
	})
	.catchall(z.unknown());

const VoiceSampleSchema = z
	.object({
		sample_id: z.string().optional().describe("The ID of the sample."),
		file_name: z
			.string()
			.optional()
			.describe("The name of the sample file."),
		mime_type: z
			.string()
			.optional()
			.describe("The MIME type of the sample file."),
		size_bytes: z
			.number()
			.int()
			.optional()
			.describe("The size of the sample file in bytes."),
		hash: z.string().optional().describe("The hash of the sample file."),
		duration_secs: z
			.number()
			.nullish()
			.describe("The duration of the sample file in seconds."),
		remove_background_noise: z
			.boolean()
			.nullish()
			.describe("Whether background noise was removed from the sample."),
		has_isolated_audio: z
			.boolean()
			.nullish()
			.describe("Whether the sample has isolated audio."),
		has_isolated_audio_preview: z
			.boolean()
			.nullish()
			.describe("Whether the sample has an isolated audio preview."),
		speaker_separation: VoiceSpeakerSeparationSchema.nullish().describe(
			"The speaker separation of the sample."
		),
		trim_start: z
			.number()
			.int()
			.nullish()
			.describe("The start of the trimmed range, in milliseconds."),
		trim_end: z
			.number()
			.int()
			.nullish()
			.describe("The end of the trimmed range, in milliseconds."),
	})
	.catchall(z.unknown());

const VoiceVerificationAttemptSchema = z
	.object({
		text: z.string().optional().describe("The text of the attempt."),
		date_unix: z
			.number()
			.int()
			.optional()
			.describe("The date of the attempt in Unix time."),
		accepted: z
			.boolean()
			.optional()
			.describe("Whether the verification attempt was accepted."),
		similarity: z
			.number()
			.optional()
			.describe("The similarity of the verification attempt."),
		levenshtein_distance: z
			.number()
			.optional()
			.describe("The Levenshtein distance of the verification attempt."),
		recording: z
			.record(z.string(), z.unknown())
			.nullish()
			.describe("The recording of the verification attempt."),
	})
	.catchall(z.unknown());

const VoiceVerificationSchema = z
	.object({
		requires_verification: z
			.boolean()
			.optional()
			.describe("Whether the voice requires verification."),
		is_verified: z
			.boolean()
			.optional()
			.describe("Whether the voice is verified."),
		verification_failures: z
			.array(z.string())
			.optional()
			.describe("The verification failures of the voice."),
		verification_attempts_count: z
			.number()
			.int()
			.optional()
			.describe("The number of verification attempts."),
		language: z
			.string()
			.nullish()
			.describe("The language of the verification."),
		verification_attempts: z
			.array(VoiceVerificationAttemptSchema)
			.nullish()
			.describe("The verification attempts of the voice."),
	})
	.catchall(z.unknown());

const VoiceFineTuningSchema = z
	.object({
		is_allowed_to_fine_tune: z
			.boolean()
			.optional()
			.describe("Whether the user may fine-tune the voice."),
		state: z
			.record(
				z.string(),
				z.enum([
					"not_started",
					"queued",
					"fine_tuning",
					"fine_tuned",
					"failed",
					"delayed",
				])
			)
			.optional()
			.describe("The state of the fine-tuning, per model."),
		verification_failures: z
			.array(z.string())
			.optional()
			.describe("The verification failures of the fine-tuning."),
		verification_attempts_count: z
			.number()
			.int()
			.optional()
			.describe("The number of verification attempts."),
		manual_verification_requested: z
			.boolean()
			.optional()
			.describe("Whether a manual verification was requested."),
		language: z
			.string()
			.nullish()
			.describe("The language of the fine-tuning."),
		progress: z
			.record(z.string(), z.number())
			.nullish()
			.describe("The progress of the fine-tuning, per model."),
		message: z
			.record(z.string(), z.string())
			.nullish()
			.describe("The message of the fine-tuning, per model."),
		dataset_duration_seconds: z
			.number()
			.nullish()
			.describe("The duration of the dataset in seconds."),
		verification_attempts: z
			.array(VoiceVerificationAttemptSchema)
			.nullish()
			.describe("The verification attempts of the fine-tuning."),
		slice_ids: z
			.array(z.string())
			.nullish()
			.describe("The IDs of the slices of the fine-tuning."),
		manual_verification: z
			.object({
				extra_text: z
					.string()
					.optional()
					.describe("The extra text of the manual verification."),
				request_time_unix: z
					.number()
					.int()
					.optional()
					.describe(
						"The date of the manual verification in Unix time."
					),
				files: z
					.array(z.record(z.string(), z.unknown()))
					.optional()
					.describe("The files of the manual verification."),
			})
			.catchall(z.unknown())
			.nullish()
			.describe("The manual verification of the fine-tuning."),
		max_verification_attempts: z
			.number()
			.int()
			.nullish()
			.describe("The maximum number of verification attempts."),
		next_max_verification_attempts_reset_unix_ms: z
			.number()
			.int()
			.nullish()
			.describe(
				"When the verification attempt counter resets, in Unix milliseconds."
			),
	})
	.catchall(z.unknown());

const VoiceSettingsSchema = z
	.object({
		stability: z
			.number()
			.nullish()
			.describe("The stability of the voice, between 0 and 1."),
		use_speaker_boost: z
			.boolean()
			.nullish()
			.describe("Whether the speaker boost is applied."),
		similarity_boost: z
			.number()
			.nullish()
			.describe("The similarity boost of the voice, between 0 and 1."),
		style: z.number().nullish().describe("The style exaggeration."),
		speed: z.number().nullish().describe("The speed of the voice."),
		clone_strength: z
			.number()
			.nullish()
			.describe("The clone strength of the voice, between 0 and 1."),
	})
	.catchall(z.unknown());

const VoiceSharingModerationCheckSchema = z
	.object({
		date_checked_unix: z
			.number()
			.int()
			.nullish()
			.describe("When the moderation check ran, in Unix time."),
		name_value: z
			.string()
			.nullish()
			.describe("The name value of the voice."),
		name_check: z
			.boolean()
			.nullish()
			.describe("Whether the name check passed."),
		description_value: z
			.string()
			.nullish()
			.describe("The description value of the voice."),
		description_check: z
			.boolean()
			.nullish()
			.describe("Whether the description check passed."),
		sample_ids: z
			.array(z.string())
			.nullish()
			.describe("The IDs of the checked samples."),
		sample_checks: z
			.array(z.number())
			.nullish()
			.describe("The checks of the samples."),
		captcha_ids: z
			.array(z.string())
			.nullish()
			.describe("The IDs of the checked CAPTCHAs."),
		captcha_checks: z
			.array(z.number())
			.nullish()
			.describe("The checks of the CAPTCHAs."),
	})
	.catchall(z.unknown());

const VoiceSharingSchema = z
	.object({
		status: z
			.enum(["enabled", "disabled", "copied", "copied_disabled"])
			.optional()
			.describe("The sharing status of the voice."),
		history_item_sample_id: z
			.string()
			.nullish()
			.describe("The sample ID of the sharing history item."),
		date_unix: z
			.number()
			.int()
			.optional()
			.describe("When the voice was shared, in Unix time."),
		whitelisted_emails: z
			.array(z.string())
			.optional()
			.describe("The emails allowed to use the voice."),
		public_owner_id: z
			.string()
			.optional()
			.describe("The ID of the public owner."),
		original_voice_id: z
			.string()
			.optional()
			.describe("The ID of the original voice."),
		financial_rewards_enabled: z
			.boolean()
			.optional()
			.describe("Whether financial rewards are enabled."),
		free_users_allowed: z
			.boolean()
			.optional()
			.describe("Whether free users may use the voice."),
		live_moderation_enabled: z
			.boolean()
			.optional()
			.describe("Whether live moderation is enabled."),
		rate: z.number().nullish().describe("The rate of the sharing."),
		fiat_rate: z
			.number()
			.nullish()
			.describe("The rate of the sharing in USD per 1000 credits."),
		notice_period: z
			.number()
			.int()
			.optional()
			.describe("The notice period of the sharing, in days."),
		disable_at_unix: z
			.number()
			.int()
			.nullish()
			.describe("When the voice leaves the library, in Unix time."),
		voice_mixing_allowed: z
			.boolean()
			.optional()
			.describe("Whether the voice may be mixed."),
		featured: z
			.boolean()
			.optional()
			.describe("Whether the voice is featured."),
		category: z.string().optional().describe("The category of the voice."),
		reader_app_enabled: z
			.boolean()
			.nullish()
			.describe("Whether the voice is enabled in the reader app."),
		image_url: z.string().nullish().describe("The image URL of the voice."),
		ban_reason: z
			.string()
			.nullish()
			.describe("The ban reason of the voice."),
		liked_by_count: z
			.number()
			.int()
			.optional()
			.describe("The number of likes of the voice."),
		cloned_by_count: z
			.number()
			.int()
			.optional()
			.describe("The number of clones of the voice."),
		name: z.string().optional().describe("The name of the voice."),
		description: z
			.string()
			.nullish()
			.describe("The description of the voice."),
		labels: z
			.record(z.string(), z.string())
			.optional()
			.describe("The labels of the voice."),
		review_status: z
			.string()
			.optional()
			.describe("The review status of the voice."),
		review_message: z
			.string()
			.nullish()
			.describe("The review message of the voice."),
		enabled_in_library: z
			.boolean()
			.optional()
			.describe("Whether the voice is enabled in the library."),
		instagram_username: z
			.string()
			.nullish()
			.describe("The Instagram username of the voice owner."),
		twitter_username: z
			.string()
			.nullish()
			.describe("The Twitter/X username of the voice owner."),
		youtube_username: z
			.string()
			.nullish()
			.describe("The YouTube username of the voice owner."),
		tiktok_username: z
			.string()
			.nullish()
			.describe("The TikTok username of the voice owner."),
		moderation_check: VoiceSharingModerationCheckSchema.nullish().describe(
			"The moderation check of the sharing."
		),
		reader_restricted_on: z
			.array(z.record(z.string(), z.unknown()))
			.nullish()
			.describe("The resources the reader restricts the voice on."),
	})
	.catchall(z.unknown());

const VoiceVerifiedLanguageSchema = z
	.object({
		language: z.string().optional().describe("The language of the voice."),
		model_id: z.string().optional().describe("The model ID of the voice."),
		accent: z
			.string()
			.nullish()
			.describe("The accent of the voice, if any."),
		locale: z
			.string()
			.nullish()
			.describe("The locale of the voice, if any."),
		preview_url: z
			.string()
			.nullish()
			.describe("The preview URL of the voice, if any."),
	})
	.catchall(z.unknown());

const VoiceSchema = z.object({
	voice_id: z.string().describe("Unique identifier for the voice."),
	name: z.string().describe("Display name of the voice."),
	samples: z
		.array(VoiceSampleSchema)
		.nullish()
		.describe("Audio samples associated with this voice."),
	category: z
		.enum([
			"generated",
			"cloned",
			"premade",
			"professional",
			"famous",
			"high_quality",
		])
		.nullable()
		.describe("Category of the voice."),
	fine_tuning: VoiceFineTuningSchema.nullable().describe(
		"Fine-tuning status and configuration for this voice."
	),
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
	settings: VoiceSettingsSchema.nullable().describe(
		"Default generation settings for this voice."
	),
	sharing: VoiceSharingSchema.nullable().describe(
		"Sharing configuration if the voice is published to the library."
	),
	high_quality_base_model_ids: z
		.array(z.string())
		.describe("Model IDs for which high-quality audio is available."),
	verified_languages: z
		.array(VoiceVerifiedLanguageSchema)
		.nullable()
		.describe("Languages that have been verified for this voice."),
	collection_ids: z
		.array(z.string())
		.nullish()
		.describe("IDs of collections this voice belongs to."),
	safety_control: z
		.enum([
			"NONE",
			"BAN",
			"CAPTCHA",
			"CAPTCHA_AND_MODERATION",
			"ENTERPRISE_BAN",
			"ENTERPRISE_CAPTCHA",
		])
		.nullish()
		.describe("Safety control level applied to this voice."),
	voice_verification: VoiceVerificationSchema.nullable().describe(
		"Verification state and history for this voice."
	),
	permission_on_resource: z
		.string()
		.nullish()
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
		.nullish()
		.describe("Unix timestamp of when the user favorited this voice."),
	created_at_unix: z
		.number()
		.int()
		.nullish()
		.describe("Unix timestamp of when the voice was created."),
	is_bookmarked: z
		.boolean()
		.nullish()
		.describe("Whether the user has bookmarked this voice."),
	recording_quality: z
		.enum(["studio", "high", "medium", "low", "good", "ok", "poor", "bad"])
		.nullish()
		.describe("Assessed quality level of the voice recordings."),
	labelling_status: z
		.enum(["in_review", "labelled", "unlabelled", "review_complete"])
		.nullish()
		.describe("Status of the voice labelling process."),
	recording_quality_reason: z
		.string()
		.nullish()
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
			)
			.nullish(),
		total_count: z
			.number()
			.int()
			.describe(
				"Total number of voices matching the query. This is a live snapshot and may change between requests; prefer has_more for pagination."
			)
			.nullish(),
		next_page_token: z
			.string()
			.nullish()
			.describe(
				"Token to pass to the next request to retrieve the next page. Null when no more results exist."
			),
	})
	.meta({
		id: "ElevenLabsVoices",
	});

export type IElevenLabsListVoicesResponse = z.infer<
	typeof ElevenLabsListVoicesResponseSchema
>;
