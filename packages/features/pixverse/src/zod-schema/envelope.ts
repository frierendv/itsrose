import { z } from "zod/v4";

/**
 * The supplemental error block some PixVerse failures carry.
 *
 * Every field is optional and unknown fields are allowed: the block is
 * supplementary, and an existing client keeps working without it.
 */
export const PixverseErrorDetailSchema = z
	.object({
		Type: z.string().optional().describe("Stable error type identifier."),
		Message: z
			.string()
			.optional()
			.describe("The cause of the error and a suggested action."),
		Param: z
			.record(z.string(), z.unknown())
			.optional()
			.describe("Details relevant to this error."),
	})
	.catchall(z.unknown())
	.meta({
		id: "PixverseErrorDetail",
		description: "Supplemental error details.",
	});

/**
 * The envelope every PixVerse JSON endpoint answers with.
 *
 * The schema is generic over the payload of `Resp`: the envelope is the
 * same for every endpoint, only the payload inside it differs.
 *
 * @param payload Schema of the `Resp` payload.
 * @returns The envelope schema.
 */
export function pixverseEnvelopeSchema<T extends z.ZodType>(payload: T) {
	return z
		.object({
			ErrCode: z
				.int()
				.describe("Business result code; 0 indicates success."),
			ErrMsg: z.string().describe("Business result message."),
			Resp: payload
				.nullable()
				.describe("Response payload; null when the request failed."),
			Error: PixverseErrorDetailSchema.optional().describe(
				"Supplemental error details."
			),
		})
		.catchall(z.unknown())
		.meta({ id: "PixverseEnvelope" });
}

/**
 * The envelope as PixVerse answers an error with, before the payload of any
 * particular endpoint is known.
 */
export const PixverseEnvelopeSchema = pixverseEnvelopeSchema(z.unknown()).meta({
	id: "PixverseRawEnvelope",
});

export type PixverseErrorDetail = z.infer<typeof PixverseErrorDetailSchema>;
export type PixverseEnvelope<T> = z.infer<
	ReturnType<typeof pixverseEnvelopeSchema<z.ZodType<T>>>
>;
