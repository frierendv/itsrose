import { z } from "zod/v4";
import {
	ElevenLabsModelIdSchema,
	ElevenLabsOutputFormatSchema,
	ElevenLabsSeedSchema,
	ElevenLabsVoiceIdSchema,
	ElevenLabsVoiceSettingSchema,
} from "../shared";

/**
 * @see https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert
 */
export const ElevenLabsTextToDialogueConvertSchema = z
	.object({
		output_format: ElevenLabsOutputFormatSchema.clone()
			.optional()
			.describe("The audio format of the output."),

		inputs: z.array(
			z
				.object({
					text: z.string(),
					// ElevenLabsVoiceIdSchema is single property.
					voice_id: ElevenLabsVoiceIdSchema,
				})
				.describe(
					"A list of dialogue inputs, each containing text and a voice ID which will be converted into speech. " +
						"See [here](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert#request.body.inputs) for more details."
				)
		),
		model_id: ElevenLabsModelIdSchema.clone().optional(),
		settings: ElevenLabsVoiceSettingSchema.clone()
			.pick({ stability: true })
			.nullish()
			.optional()
			.describe("The voice settings to use for the conversion."),
		language_code: z
			.string()
			.nullish()
			.optional()
			.describe(
				"Language code (ISO 639-1) used to enforce a language for the model and text normalization."
			),
		apply_text_normalization: z
			.enum(["auto", "on", "off"])
			.optional()
			.describe("Whether to apply text normalization to the input text."),
		seed: ElevenLabsSeedSchema,
	})
	.meta({
		id: "ElevenLabsTextToDialogue",
	});

export interface IElevenLabsTextToDialogueConvert extends z.infer<
	typeof ElevenLabsTextToDialogueConvertSchema
> {}
