import { z } from "zod/v4";
import {
	ElevenLabsModelIdSchema,
	ElevenLabsOutputFormatSchema,
	ElevenLabsSeedSchema,
	ElevenLabsVoiceIdSchema,
	ElevenLabsVoiceSettingSchema,
} from "../shared";

/**
 * Ref: {@link https://elevenlabs.io/docs/api-reference/text-to-speech/convert | Create speech}
 */
export const ElevenLabsTextToSpeechConvertSchema = z
	.object({
		text: z
			.string()
			.describe("The text that will get converted into speech."),
		// ElevenLabsVoiceIdSchema is single property.
		voice_id: ElevenLabsVoiceIdSchema,
		model_id: ElevenLabsModelIdSchema.clone().optional(),
		output_format: ElevenLabsOutputFormatSchema.clone()
			.optional()
			.describe("The audio format of the output."),
		language_code: z
			.string()
			.nullish()
			.optional()
			.describe(
				"The language code of the text. " +
					"If not specified, the system will attempt to auto-detect the language."
			),
		// Do not touch original schema.
		voice_settings: ElevenLabsVoiceSettingSchema.clone()
			.nullish()
			.optional()
			.describe("The voice settings to use for the conversion."),

		// ElevenLabsSeedSchema is single property.
		seed: ElevenLabsSeedSchema,
		previous_text: z
			.string()
			.nullish()
			.optional()
			.describe(
				"The text that came before the text of the current request."
			),
		next_text: z
			.string()
			.nullish()
			.optional()
			.describe(
				"The text that comes after the text of the current request."
			),
		apply_text_normalization: z
			.enum(["auto", "on", "off"])
			.optional()
			.describe("Whether to apply text normalization to the input text."),
		apply_language_text_normalization: z
			.boolean()
			.optional()
			.describe(
				"This parameter controls language text normalization. " +
					"This helps with proper pronunciation of text in some supported languages. " +
					"Currently only supported for `Japanese`."
			),
	})
	.meta({
		id: "ElevenLabsTextToSpeech",
	});

/**
 * Ref: {@link https://elevenlabs.io/docs/api-reference/text-to-speech/convert | Create speech}
 */

export interface IElevenLabsTextToSpeechConvert extends z.infer<
	typeof ElevenLabsTextToSpeechConvertSchema
> {}
