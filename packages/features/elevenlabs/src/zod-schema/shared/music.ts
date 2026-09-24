import { z } from "zod/v4";

export const MusicAdherenceSchema = z.enum(["low", "medium", "high"]);
export const MusicAudioRefSchema = z
	.object({
		song_id: z
			.string()
			.min(1)
			.max(100)
			.describe("The ID of the song to source the chunk from."),
		range: z
			.object({
				start_ms: z.number(),
				end_ms: z.number(),
			})
			.describe("The time range to extract from the song."),
	})
	.meta({
		title: "MusicAudioRef",
		id: "ElevenLabsMusicAudioRefSchema",
	});

export const MusicDurationMsSchema = z
	.number()
	.min(3_000) // 3000ms
	.max(120_000) // 120000ms
	.describe("The duration in milliseconds.");

export const MusicCompositionPromptSectionSchema = z.object({
	section_name: z
		.string()
		.min(1)
		.max(100)
		.describe("The name of the section."),
	positive_local_styles: z
		.array(z.string())
		.describe(
			"The styles and musical directions that **should be present** in this section."
		),
	negative_local_styles: z
		.array(z.string())
		.describe(
			"The styles and musical directions that **should not be present** in this section."
		),
	duration_ms: MusicDurationMsSchema.describe(
		"The duration of the chunk in milliseconds."
	),
	lines: z
		.array(z.string().max(300))
		.max(30)
		.describe(
			"The lyrics of the section. Max 30 lines per section and max 200 characters per line."
		),
	source_from: z
		.object({
			negative_ranges: z
				// MusicAudioRefChunkSchema.range
				.object({ start_ms: z.number(), end_ms: z.number() })
				.describe("The ranges to exclude from the 'range'."),
		})
		.extend(MusicAudioRefSchema.shape)
		.nullish()
		.optional(),
});
export const MusicCompositionPromptSchema = z
	.object({
		positive_global_styles: z
			.array(z.string())
			.describe(
				"The styles and musical directions that **should be present** in the entire song."
			),
		negative_global_styles: z
			.array(z.string())
			.describe(
				"The styles and musical directions that **should not be present** in the entire song."
			),
		sections: z.array(MusicCompositionPromptSectionSchema),
	})
	.meta({
		title: "MusicCompostionPrompt",
		description:
			"Composition plan for the `music_v1` model. Using this field with any other model will result in an error.",
		id: "ElevenLabsMusicCompostionPromptSchema",
	});

export const MusicCompositionGenerationChunk = z
	.object({
		text: z
			.string()
			.max(6132)
			.describe(
				"The text config to be generated for this chunk. " +
					"Can contain an optional section name in square brackets at the beginning, e.g. [Verse 1], lyrics lines, and inline directions in curly braces, e.g. {scratching}." +
					"Section names must be between 1 and 100 characters. At most 30 lines are allowed, each at most 200 characters."
			),
		duration_ms: MusicDurationMsSchema.describe(
			"The duration of the chunk in milliseconds. Must be between `3000ms` and `120000ms`."
		),
		positive_styles: z
			.array(z.string())
			.describe(
				"The styles and musical directions that should be present in this chunk. Use English language for best results. \n" +
					"The styles for the first chunk are the most important as they set the overall tone and genre. " +
					"Styles for subsequent chunks can be used to add nuance, progression, emphasis, or change the direction of the song. " +
					"Aim to have at least 6-7 styles in early chunks until the direction is established. " +
					"Generic styles like `great production quality` are good default styles to append to the list."
			),
		negative_styles: z
			.array(z.string())
			.describe(
				"The styles and musical directions that should not be present in this chunk.\n" +
					"Leaving empty is a good default, only use this field if you want to explicitly avoid a particular style or direction."
			)
			.optional(),
		context_adherence: z
			.optional(MusicAdherenceSchema)
			.describe(
				"How much the model adheres to the context of its surrounding chunks. " +
					"Low adherence means the model can deviate from the context and be more creative. " +
					"High adherence means the model will be more consistent with the context."
			)
			.optional(),
		conditioning_ref: z
			.object(MusicAudioRefSchema.shape)
			.describe(
				"The audio reference to condition the generation on. " +
					"The first chunk is the most important as it will influence the generation of all subsequent chunks. " +
					"Thus, if you want to apply conditioning to the entire song, start conditioning from the first chunk."
			)
			.nullish()
			.optional(),
		condition_strength: z
			.enum(["low", "medium", "high", "xhigh"])
			.describe(
				"How strongly the model adheres to the conditioning reference. " +
					"Low strength means the model will be more creative and deviate from the reference. " +
					"High strength means the model will be more consistent with the reference."
			)
			.nullish()
			.optional(),
	})
	.meta({
		title: "MusicCompositionGenerationChunk",
		id: "ElevenLabsMusicCompositionGenerationChunk",
	});

export const MusicCompositionPlanSchema = z
	.object({
		chunks: z.array(
			z.union([MusicCompositionGenerationChunk, MusicAudioRefSchema])
		),
	})
	.meta({
		title: "MusicCompositionPlan",
		description:
			"Composition plan for the `music_v2` and `music_v2_5` models. Using this field with any other model will result in an error.",
		id: "ElevenLabsMusicCompositionPlanSchema",
	});

export type MusicCompositionPromptSection = z.infer<
	typeof MusicCompositionPromptSectionSchema
>;
export type MusicCompositionPrompt = z.infer<
	typeof MusicCompositionPromptSchema
>;
export type MusicCompositionPlan = z.infer<typeof MusicCompositionPlanSchema>;
