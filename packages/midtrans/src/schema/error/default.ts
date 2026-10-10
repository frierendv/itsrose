import { z } from "zod/v4";

export const DefaultErrorSchema = z.object({
	/**
	 * An array of error message returned by Midtrans API.
	 *
	 * @default
	 * []
	 */
	error_messages: z.array(z.string()),
});

export type DefaultError = z.infer<typeof DefaultErrorSchema>;
