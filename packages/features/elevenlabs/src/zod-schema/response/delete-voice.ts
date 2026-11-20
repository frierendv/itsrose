import { z } from "zod/v4";

export const ElevenLabsDeleteVoiceResponseSchema = z.object({
	status: z.literal("ok").describe("The status of the deletion."),
});

export type IElevenLabsDeleteVoiceResponse = z.infer<
	typeof ElevenLabsDeleteVoiceResponseSchema
>;
