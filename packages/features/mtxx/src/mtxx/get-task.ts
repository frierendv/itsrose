import { client } from "../client";
import { parseResult } from "../utils";
import type { GetTask, ISharedResponse } from "../zod-schema";
import { GetTaskSchema, SharedResponseSchema } from "../zod-schema";

/**
 * Get sync task.
 */
export const getTask = async (opts: GetTask): Promise<ISharedResponse> => {
	const { task_id } = opts;
	const { data } = await client.getTaskStatus(task_id);
	return parseResult(data);
};
/** @internal */
export const getTaskSchema = {
	request: GetTaskSchema,
	response: SharedResponseSchema,
};
