import { z } from "zod/v4";
import {
	ElevenLabsModelIdSchema,
	ElevenLabsOutputFormatSchema,
	ElevenLabsSeedSchema,
	ElevenLabsVoiceIdSchema,
	ElevenLabsVoiceSettingSchema,
} from "../shared";

/**
 * `audio` field is not included in this schema because it is sent as multipart form data, not as JSON.
 * @see https://elevenlabs.io/docs/api-reference/speech-to-speech/convert
 */
export const ElevenLabsSpeechToSpeechConvertSchema = z
	.object({
		voice_id: ElevenLabsVoiceIdSchema,
		output_format: ElevenLabsOutputFormatSchema.clone().optional(),

		seed: ElevenLabsSeedSchema.clone().optional(),
		model_id: ElevenLabsModelIdSchema.clone().optional(),
		voice_settings: z
			.preprocess((val) => {
				if (typeof val === "string") {
					try {
						return JSON.parse(val);
					} catch {
						return val; // Let Zod report the type error
					}
				}
				return val;
			}, ElevenLabsVoiceSettingSchema.clone())
			.optional(),
		remove_background_noise: z
			.preprocess((val) => {
				if (typeof val === "string") {
					if (val.toLowerCase() === "true") {
						return true;
					}
					if (val.toLowerCase() === "false") {
						return false;
					}
				}
				return val;
			}, z.boolean().optional())
			.describe(
				"Whether to remove background noise from the input audio. " +
					"This can help improve the quality of the output audio, " +
					"especially if the input audio is noisy."
			),
		file_format: z
			.enum(["pcm_s16le_16", "other"])
			.optional()
			.describe(
				"The format of input audio. " +
					"For `pcm_s16le_16`, the input audio must be 16-bit PCM at a 16kHz sample rate, " +
					"single channel (mono), and little-endian byte order. "
			),
	})
	.meta({
		id: "ElevenLabsSpeechToSpeech",
	});

export interface IElevenLabsSpeechToSpeechConvert extends z.infer<
	typeof ElevenLabsSpeechToSpeechConvertSchema
> {}
