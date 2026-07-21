import { SyncState } from "@itsrose/common";
import { z } from "zod/v4";

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

export interface ISharedResponse extends z.infer<typeof SharedResponseSchema> {}
