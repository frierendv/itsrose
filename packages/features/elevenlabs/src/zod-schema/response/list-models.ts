import { z } from "zod";

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const LanguageSchema = z.object({
	/** IETF language tag or internal identifier (e.g. "en", "es") */
	language_id: z.string(),
	/** Human-readable language name (e.g. "English") */
	name: z.string(),
});

const ModelRatesSchema = z.object({
	/** Multiplier applied to the base character cost */
	character_cost_multiplier: z.number(),
	/** Discount multiplier (1 = no discount) */
	cost_discount_multiplier: z.number(),
});

// ── Core model schema ─────────────────────────────────────────────────────────

const ModelSchema = z.object({
	/** Unique identifier for the model */
	model_id: z.string(),

	/** Display name of the model */
	name: z.string(),

	/** Whether the model supports fine-tuning */
	can_be_finetuned: z.boolean(),

	/** Whether the model supports text-to-speech */
	can_do_text_to_speech: z.boolean(),

	/** Whether the model supports voice conversion */
	can_do_voice_conversion: z.boolean(),

	/** Whether the model supports the style parameter */
	can_use_style: z.boolean(),

	/** Whether the model supports speaker boost */
	can_use_speaker_boost: z.boolean(),

	/** Whether the model serves professional-tier voices */
	serves_pro_voices: z.boolean(),

	/** Token cost multiplier relative to the base rate */
	token_cost_factor: z.number(),

	/** Human-readable description of the model */
	description: z.string(),

	/** Whether the model requires alpha-program access */
	requires_alpha_access: z.boolean(),

	/** Max characters per request for free-tier users */
	max_characters_request_free_user: z.number().int(),

	/** Max characters per request for subscribed users */
	max_characters_request_subscribed_user: z.number().int(),

	/** Hard cap on text length accepted by this model */
	maximum_text_length_per_request: z.number().int(),

	/** Languages this model supports */
	languages: z.array(LanguageSchema),

	/** Billing rate configuration for this model */
	model_rates: ModelRatesSchema,

	/** Concurrency pool the model belongs to */
	concurrency_group: z.string(),
});

// ── Top-level response ────────────────────────────────────────────────────────

/** `GET /v1/models` → 200 response (array of models) */
export const ElevenLabsListModelsResponseSchema = z
	.object({
		models: z.array(ModelSchema).describe("List of available models"),
	})
	.meta({
		id: "ElevenLabsModels",
	});

export type IElevenLabsListModelsResponse = z.infer<
	typeof ElevenLabsListModelsResponseSchema
>;
