import { z } from "zod/v4";

export const ElevenLabsSharedResponseSchema = z
	.object({
		audio_base64: z.string().describe("Base64-encoded audio data"),
	})
	.meta({
		id: "ElevenLabsData",
	});

export interface IElevenLabsSharedResponse extends z.infer<
	typeof ElevenLabsSharedResponseSchema
> {}
