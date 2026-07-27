import { z } from "zod/v4";

/**
 * Zod schema for validating API sync waiting timeout values in seconds (-1 to 60).
 */
export const SharedSyncTimeoutSchema = z
	.number()
	.min(-1)
	.max(60)
	.describe(
		"**Synchronized waiting timeout (seconds).**\n\n" +
			"`-1` means no waiting, the API returns immediately. " +
			"Default `30`.\n\n" +
			"> [!tip]\n > It is recommended to use the Task Query"
	)
	.meta({ example: 30 });

/**
 * Type inferenced from {@linkcode SharedSyncTimeoutSchema}.
 */
export type SharedSyncTimeout = z.infer<typeof SharedSyncTimeoutSchema>;
