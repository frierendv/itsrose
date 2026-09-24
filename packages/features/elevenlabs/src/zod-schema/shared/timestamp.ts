import { z } from "zod/v4";

export const ElevenLabsAlignmentSchema = z
	.object({
		characters: z.array(z.string()).describe("List of strings"),
		character_start_times_seconds: z
			.array(z.number())
			.describe("List of doubles"),
		character_end_times_seconds: z
			.array(z.number())
			.describe("List of doubles"),
	})
	.meta({
		id: "ElevenLabsAlignmentSchema",
		description: "Character-level timing information.",
	});

export const WithTimestampSchema = z.object({
	alignment: ElevenLabsAlignmentSchema,
	normalized_alignment: ElevenLabsAlignmentSchema,
});

export type ElevenLabsAlignment = z.infer<typeof ElevenLabsAlignmentSchema>;
export type WithTimestamp = z.infer<typeof WithTimestampSchema>;
