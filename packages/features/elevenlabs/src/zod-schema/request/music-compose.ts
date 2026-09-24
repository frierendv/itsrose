import { z } from "zod/v4";
import {
	ElevenLabsOutputFormatSchema,
	ElevenLabsSeedSchema,
	MusicCompositionPlanSchema,
	MusicCompositionPromptSchema,
	MusicDurationMsSchema,
	MusicModelVersionSchema,
} from "../shared";

/**
 * https://elevenlabs.io/docs/api-reference/music/compose
 *
 * POST /v1/music
 */

export const BaseMusicComposeSchema = z.object({
	model_id: MusicModelVersionSchema.optional().default("music_v1"),

	output_format: z
		.union([
			z
				.literal("auto")
				.describe(
					"Use “auto” (the default) to let the API pick the best format for the selected model"
				)
				.meta({ title: "auto" }),
			ElevenLabsOutputFormatSchema,
		])
		.default("auto")
		.optional(),

	// finetune_id: z
	// 	.string()
	// 	.max(100)
	// 	.nullish()
	// 	.optional()
	// 	.describe("The ID of the finetune to use for the generation"),

	// never store it
	// store_for_inpainting: z
	// 	.boolean()
	// 	.optional()
	// 	.describe("Whether to store the generated song for inpainting."),

	sign_with_c2pa: z
		.boolean()
		.optional()
		.describe(
			"Whether to sign the generated song with C2PA. Applicable only for mp3 files."
		)
		.meta({ example: false }),
	with_timestamps: z
		.boolean()
		.default(false)
		.optional()
		.describe(
			"Whether to return the timestamps of the words in the generated song."
		),
	with_waveform_visual: z
		.boolean()
		.default(false)
		.optional()
		.describe(
			"Whether to return the visual waveform of the generated song."
		),
});

export const MusicComposePromptStrategySchema = z.object({
	prompt: z
		.string()
		.max(4100)
		.describe(
			"A simple text prompt to generate a song from. " +
				"Cannot be used in conjunction with `composition_plan`."
		),

	music_length_ms: MusicDurationMsSchema.nullish()
		.optional()
		.describe(
			"The length of the song to generate in milliseconds. " +
				"Used only in conjunction with `prompt`."
		),

	force_instrumental: z
		.boolean()
		.optional()
		.describe(
			"If true, guarantees that the generated song will be instrumental. " +
				"If false, the song may or may not be instrumental depending on the prompt."
		)
		.meta({ example: false }),
});

export const MusicComposeCompositionStrategySchema = z.object({
	seed: ElevenLabsSeedSchema.nullish()
		.optional()
		.describe(
			"Random seed to initialize the music generation process. " +
				"Cannot be used in conjunction with `prompt`."
		),

	composition_plan: z
		.union([MusicCompositionPromptSchema, MusicCompositionPlanSchema])
		.describe(
			"A detailed composition plan to guide music generation. " +
				"Cannot be used in conjunction with `prompt`."
		),

	respect_sections_durations: z
		.boolean()
		.optional()
		.describe(
			"Controls how strictly section durations in the composition_plan are enforced. " +
				"Only applies to music_v1. For music_v2 and music_v2_5, " +
				"section durations are always enforced and this field is ignored."
		),
});

export const MusicComposeSchema = BaseMusicComposeSchema.and(
	z.union([
		MusicComposePromptStrategySchema.meta({
			title: "Prompt Strategy",
		}),
		MusicComposeCompositionStrategySchema.meta({
			title: "Composition Plan Strategy",
		}),
	])
);

export type MusicCompose = z.infer<typeof MusicComposeSchema>;
//
// ------- https://elevenlabs.io/docs/api-reference/music/create-composition-plan -------
//
export const BaseMusicComposePlanScema = z.object({
	prompt: z.string().describe("A simple text prompt to compose a plan from."),
	music_length_ms: MusicDurationMsSchema.describe(
		"The length of the composition plan to generate in milliseconds. \n" +
			"Optional - if not provided, the model will choose a length based on the prompt."
	)
		.nullish()
		.optional(),
});
export const MusicComposePlanSchema = BaseMusicComposePlanScema.and(
	z.discriminatedUnion("model_id", [
		z
			.object({
				model_id: MusicModelVersionSchema.extract(["music_v1"]),
				source_composition_plan: MusicCompositionPromptSchema.nullish()
					.optional()
					.meta({ example: null }),
			})
			.meta({ title: "MusicCompositionPrompt" }),

		z
			.object({
				model_id: MusicModelVersionSchema.exclude(["music_v1"]),
				source_composition_plan: MusicCompositionPlanSchema.nullish()
					.optional()
					.meta({ example: null }),
			})
			.meta({ title: "MusicCompositionPlan" }),
	])
);
export type MusicComposePlan = z.infer<typeof MusicComposePlanSchema>;
