import { z } from "zod/v4";
import { SyncState } from "../../constants/sync-state";

const SharedResponseBaseSchema = z.object({
	status: z.enum(SyncState).describe("Task status"),
	task_id: z.string().describe("Task Unique Identifier"),
	media_list: z.array(z.string()).describe("Output media list"),
});

// Export the raw object schema separately so it stays extendable
export const SharedResponseSchema = z
	.looseObject(SharedResponseBaseSchema.shape)
	.meta({
		id: "MTXxResponse",
		description: "The response schema for MTXx API.",
	});

export type ISharedResponse = z.infer<typeof SharedResponseSchema>;
