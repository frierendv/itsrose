import { z } from "zod/v4";

/* -------------------------------------------------------------------------- */
/*                               Feature union                                */
/* -------------------------------------------------------------------------- */

/**
 * Client copy of `GENERATION_FEATURES` in `@itsrose/auth-resources/types`.
 *
 * The server union is closed and the dashboard does not depend on the
 * resources package, so the values are mirrored here. A new feature is a
 * schema-adjacent change: extend both lists in the same change, otherwise a
 * generation the API records is rejected by the dashboard's parser.
 */
export const GENERATION_FEATURES = [
	"text_to_speech",
	"text_to_speech_with_timestamps",
	"speech_to_speech",
	"text_to_dialogue",
	"music_compose",
] as const;

export const generationFeatureSchema = z.enum(GENERATION_FEATURES);

export type GenerationFeature = z.infer<typeof generationFeatureSchema>;

/* -------------------------------------------------------------------------- */
/*                              Request payloads                              */
/* -------------------------------------------------------------------------- */

/** The `POST /studio/speech` body. `model_id` and `output_format` use the provider defaults. */
export const generateSpeechInputSchema = z.object({
	text: z.string().min(1).max(5000),
	voice_id: z.string().min(1),
	model_id: z.string().optional(),
	output_format: z.string().optional(),
});

export type GenerateSpeechInput = z.infer<typeof generateSpeechInputSchema>;

/** The `GET /studio/generations` query. The API applies its own defaults. */
export type ListGenerationsParams = {
	feature?: GenerationFeature;
	limit?: number;
	offset?: number;
};

/** The `POST /studio/generations/:id/save` body; the API derives a name when omitted. */
export const saveGenerationInputSchema = z.object({
	filename: z.string().min(1).optional(),
});

export type SaveGenerationInput = z.infer<typeof saveGenerationInputSchema>;

/* -------------------------------------------------------------------------- */
/*                          Wire payloads (snake_case)                        */
/* -------------------------------------------------------------------------- */

/** The `POST /studio/speech` result. `saved` is false until the result is promoted. */
export const generateSpeechResponseSchema = z.object({
	generation_id: z.string(),
	audio_url: z.string(),
	expires_at: z.string(),
	saved: z.boolean(),
});

export type GenerateSpeechResponse = z.infer<
	typeof generateSpeechResponseSchema
>;

/**
 * One row of the generation history.
 *
 * `expired` is derived by the server rather than stored, and a saved row
 * answers through `asset_id` even after its ephemeral object is gone.
 */
export const generationItemSchema = z.object({
	generation_id: z.string(),
	feature: generationFeatureSchema,
	status: z.string(),
	input_text: z.string().nullable(),
	created_at: z.string(),
	expires_at: z.string().nullable(),
	saved: z.boolean(),
	asset_id: z.string().nullable(),
	expired: z.boolean(),
});

export type GenerationItem = z.infer<typeof generationItemSchema>;

/** The `GET /studio/generations` page. The API has no total; `limit`/`offset` are the cursor. */
export const generationListSchema = z.object({
	items: z.array(generationItemSchema),
	limit: z.int().nonnegative(),
	offset: z.int().nonnegative(),
});

export type GenerationList = z.infer<typeof generationListSchema>;

/** The signed read minted by `GET /studio/generations/:id/url`. */
export const generationUrlSchema = z.object({
	url: z.string(),
	expires_in: z.int().nonnegative(),
	source: z.enum(["library", "generated"]),
});

export type GenerationUrl = z.infer<typeof generationUrlSchema>;

/** The `POST /studio/generations/:id/save` acknowledgement. */
export const saveGenerationResponseSchema = z.object({
	asset_id: z.string(),
	saved: z.boolean(),
	already_saved: z.boolean().optional(),
});

export type SaveGenerationResponse = z.infer<
	typeof saveGenerationResponseSchema
>;

/** The `DELETE /studio/generations/:id` acknowledgement. */
export const deleteGenerationSchema = z.object({
	deleted: z.boolean(),
});

export type DeleteGeneration = z.infer<typeof deleteGenerationSchema>;
