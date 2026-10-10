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
	words_timestamps: z.any().optional(),
	waveform_visual: z.any().optional(),
});

export type MusicComposePlanResponse = z.infer<
	typeof MusicComposePlanResponseSchema
>;
export type MusicComposeDetailedResponse = z.infer<
	typeof MusicComposeDetailedResponseSchema
>;
