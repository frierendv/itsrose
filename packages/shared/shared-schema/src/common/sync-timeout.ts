import { z } from "zod/v4";

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

export type SharedSyncTimeout = z.infer<typeof SharedSyncTimeoutSchema>;
