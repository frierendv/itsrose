import { z } from "zod/v4";

/**
 * @see https://elevenlabs.io/docs/api-reference/voices/ivc/create
 */
export const ElevenLabsCreateIVCVoiceSchema = z
	.object({
		audio_urls: z.array(z.url()).describe("List of audio url."),
		name: z
			.string()
			.min(1)
			.max(100)
			.describe(
				// Do not add any personally identifiable information (PII) in the name. ie email, phone number, address, etc.
				`A name to identify this voice.

> [!warning]
> **Do not** include personally identifiable information (PII),
> such as your email address, phone number, home address, or full legal name.

> [!note]
> Any personal information you include will be automatically redacted.`.trim()
			),
		remove_background_noise: z.coerce
			.boolean()
			.optional()
			.describe(
				"Whether to remove background noise from the audio files. Defaults to false."
			),
		description: z
			.string()
			.max(500)
			.optional()
			.describe("A description of the voice."),

		// map from strings to strings or string or null
		labels: z
			.union([z.record(z.string(), z.string()), z.string()])
			.nullish()
			.optional()
			.describe(
				"Labels for the voice. Keys can be language, accent, gender, or age."
			),
	})
	.meta({
		id: "ElevenLabsCreateIVCVoice",
	});

export interface IElevenLabsCreateIVCVoice extends z.infer<
	typeof ElevenLabsCreateIVCVoiceSchema
> {}
