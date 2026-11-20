import { z } from "zod/v4";
import { ElevenLabsVoiceIdSchema } from "../shared";

/**
 * @see https://elevenlabs.io/docs/api-reference/voices/delete
 */
export const ElevenLabsDeleteVoiceSchema = z
	.object({
		voice_id: ElevenLabsVoiceIdSchema,
	})
	.meta({
		id: "ElevenLabsDeleteVoice",
	});

export type IElevenLabsDeleteVoice = z.infer<
	typeof ElevenLabsDeleteVoiceSchema
>;
