import { z } from "zod/v4";

/**
 * Shared response schema for ElevenLabs API.
 */
export const ElevenLabsSharedResponseSchema = z
	.object({
		/**
		 * The generated audio.
		 */
		audio: z.string().describe("Base64-encoded audio data"),
	})
	.meta({
		id: "ElevenLabsData",
	});
export const ElevenLabsSharedResponseAudioSchema = z.object({
	/**
	 * Audio response format.
	 */
	"response-audio-format": z
		.enum(["url", "base64"])
		.optional()
		.describe("By default the audio response format is base64"),
});
export interface IElevenLabsSharedResponse extends z.infer<
	typeof ElevenLabsSharedResponseSchema
> {}
