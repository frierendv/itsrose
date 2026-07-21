import { z } from "zod";

/**
 * @see https://elevenlabs.io/docs/api-reference/text-to-speech/convert#request.path.voice_id
 */
export const ElevenLabsVoiceIdSchema = z
	.string()
	.describe(
		"ID of the voice to be used. " +
			"Use the [`GET` Voices](#tag/elevenlabs/GET/elevenlabs/get_voices) voices endpoint list all the available voices."
	);

export type TElevenLabsVoiceId = z.infer<typeof ElevenLabsVoiceIdSchema>;
