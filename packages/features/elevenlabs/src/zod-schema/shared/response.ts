import { z } from "zod/v4";

/**
 * Shared response schema for ElevenLabs API.

 */
export const ElevenLabsSharedResponseSchema = z
	.object({
		/**
		 * base64 encoded audio.
		 */
		audio_base64: z.string().describe("Base64-encoded audio data"),
	})
	.meta({
		id: "ElevenLabsData",
	});

export interface IElevenLabsSharedResponse extends z.infer<
	typeof ElevenLabsSharedResponseSchema
> {}
