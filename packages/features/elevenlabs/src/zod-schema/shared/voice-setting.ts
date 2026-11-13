import { z } from "zod/v4";

/**
 * {@link https://elevenlabs.io/docs/api-reference/text-to-speech/convert#request.body.voice_settings}
 */
export const ElevenLabsVoiceSettingSchema = z
	.object({
		// double or null Optional,0-1
		// Defaults to 0.5
		stability: z
			.number()
			.min(0)
			.max(1)
			.nullish()
			.optional()
			.describe(
				"Determines how stable the voice is and the randomness between each generation."
			),
		use_speaker_boost: z
			.boolean()
			.nullish()
			.optional()
			.describe(
				"Whether to boost the speaker's voice. " +
					"This can make the voice sound louder and more prominent in the audio."
			),
		similarity_boost: z
			.number()
			.min(0)
			.max(1)
			.nullish()
			.optional()
			.describe(
				"Determines how closely the AI should adhere to the original voice when attempting to replicate it."
			),
		style: z
			.number()
			.nullish()
			.optional()
			.describe(
				"Determines the style exaggeration of the voice." +
					"This setting attempts to amplify the style of the original speaker. " +
					"It does consume additional computational resources and might increase " +
					"latency if set to anything other than 0."
			),
		speed: z
			.number()
			.nullish()
			.optional()
			.describe(
				"Adjusts the speed of the voice. A value of 1.0 is the default speed, " +
					"while values less than 1.0 slow down the speech, and values greater than 1.0 speed it up."
			),
	})

	.meta({
		description: "The voice settings for the generated audio.",
		id: "ElevenLabsVoiceSetting",
	});

export type IElevenLabsVoiceSetting = z.infer<
	typeof ElevenLabsVoiceSettingSchema
>;
