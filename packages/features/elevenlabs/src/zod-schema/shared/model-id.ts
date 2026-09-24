import { z } from "zod";

/**
 * {@link https://elevenlabs.io/docs/api-reference/text-to-speech/convert#request.path.model_id}
 */
export const ElevenLabsModelIdSchema = z
	.string()
	.describe(
		"Identifier of the model that will be used. " +
			"Use the [`GET` Models](#tag/elevenlabs/GET/elevenlabs/get_models) to list all the available models. " +
			"And see:\n - **`can_do_text_to_speech`** for `text_to_speech`/`text_to_dialogue`\n - **`can_do_voice_conversion`** for `speech_to_speech`"
	);

export type ElevenLabsModelId = z.infer<typeof ElevenLabsModelIdSchema>;

export const MusicModelVersionSchema = z.enum([
	"music_v1",
	"music_v2",
	"music_v2_5",
]);
export type MusicModelVersion = z.infer<typeof MusicModelVersionSchema>;
