/**
 * The Remini client, replaced by a stub.
 */
import {
	ReminiRequestSchema,
	ReminiResponseSchema,
} from "../../../features/remini/src/zod-schema";

export const createTask = async () => ({
	media_list: ["https://remini.test/result.jpg"],
});
export const createTaskSchema = {
	request: ReminiRequestSchema,
	response: ReminiResponseSchema,
};
