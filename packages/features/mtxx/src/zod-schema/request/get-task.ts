import { z } from "zod/v4";

export const GetTaskSchema = z.object({
	task_id: z.string().describe("Task id."),
});
export type GetTask = z.infer<typeof GetTaskSchema>;
