import { z } from "zod/v4";
import {
	MusicCompositionPlanSchema,
	MusicCompositionPromptSchema,
} from "../shared";

export const MusicComposePlanResponseSchema = z.union([
	MusicCompositionPromptSchema,
	MusicCompositionPlanSchema,
]);

export const MusicComposeDetailedResponseSchema = z.object({
	audio: z.string().describe("Audio base64"),
	composition_plan: MusicComposePlanResponseSchema,
	song_metadata: z
		.object({
			description: z.string().nullish(),
			genres: z.array(z.string()),
			is_explicit: z.boolean().nullish(),
			languages: z.array(z.string()),
			title: z.string().nullish(),
		})
		.describe(
			"Song metadata; `null` or empty if `composition_plan` request passed"
		),
	/**
	 * The word-level timestamps of the generated song.
	 *
	 * The upstream sends one entry per word, with the moment the word starts
	 * and the moment it ends, both in milliseconds. The list is absent unless
	 * the request asked for it, and `null` when the song has no words.
	 */
	words_timestamps: z
		.array(
			z.object({
				word: z.string().describe("The word."),
				start_ms: z
					.number()
					.describe("When the word starts, in milliseconds."),
				end_ms: z
					.number()
					.describe("When the word ends, in milliseconds."),
			})
		)
		.nullish(),
	/**
	 * A low-resolution waveform of the generated song, for a preview.
	 *
	 * The upstream sends four values per second of audio, from -1000 to 1000,
	 * with the stereo channels mixed down to one. The list is absent unless
	 * the request asked for it.
	 */
	waveform_visual: z.array(z.number().int()).nullish(),
});

export type MusicComposePlanResponse = z.infer<
	typeof MusicComposePlanResponseSchema
>;
export type MusicComposeDetailedResponse = z.infer<
	typeof MusicComposeDetailedResponseSchema
>;
