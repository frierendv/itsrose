/**
 * The Remini client, replaced by a stub.
 */
import {
	ReminiRequestSchema,
	ReminiResponseSchema,
} from "../../../features/remini/src/zod-schema";

export const createTask = async () => ({ task_id: "task" });
export const createTaskSchema = {
	request: ReminiRequestSchema,
	response: ReminiResponseSchema,
};
