import { z } from "zod/v4";

/**
 * Error returned with HTTP 401 (`{ "error": "Unauthorized" }`).
 */
export const UnauthorizedErrorSchema = z.object({
	error: z.string(),
});

export type UnauthorizedError = z.infer<typeof UnauthorizedErrorSchema>;
