import { z } from "zod/v4";

export const ElevenLabsErrorResponseSchema = z.object({
	detail: z.object({
		status: z.string(),
		message: z.string(),
	}),
});

export interface IElevenLabsErrorResponse extends z.infer<
	typeof ElevenLabsErrorResponseSchema
> {}
