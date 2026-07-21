import { z } from "zod/v4";

export const ElevenLabsCreateIVCVoiceResponseSchema = z.object({
	voice_id: z
		.string()
		.describe("The unique identifier for the created voice."),
	requires_verification: z
		.boolean()
		.describe("Whether the voice requires verification"),
});

export interface IElevenLabsCreateIVCVoiceResponse extends z.infer<
	typeof ElevenLabsCreateIVCVoiceResponseSchema
> {}
