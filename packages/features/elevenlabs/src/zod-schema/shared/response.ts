import { z } from "zod/v4";

/**
 * Shared response schema for ElevenLabs API.
 */
export const ElevenLabsSharedResponseSchema = z
	.object({
		/**
		 * The generated audio.
		 */
		audio: z
			.string()
			.describe(
				"Base64-encoded audio data or url; depends on `response-audio-format` header."
			),
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
		.default("base64")
		.describe("By default the audio response format is base64"),
});
export type IElevenLabsSharedResponse = z.infer<
	typeof ElevenLabsSharedResponseSchema
>;
