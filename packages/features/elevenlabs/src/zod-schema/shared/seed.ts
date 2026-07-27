import { z } from "zod/v4";

/**
 * {@link https://elevenlabs.io/docs/api-reference/text-to-speech/convert#request.body.seed}
 */
export const ElevenLabsSeedSchema = z
	.number()
	.int()
	.min(0)
	.max(2147483647)
	.nullish()
	.optional()
	.describe(
		"If specified, the system attempts to sample deterministically. " +
			"Determinism is not guaranteed. Must be integer between `0` and `4294967295`."
	);

export type TElevenLabsSeed = z.infer<typeof ElevenLabsSeedSchema>;
