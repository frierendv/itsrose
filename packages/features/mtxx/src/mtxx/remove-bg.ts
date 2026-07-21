import { client } from "../client";
import { createMediaProfile, createSDKParameter, parseResult } from "../utils";
import type { ISharedRequest } from "../zod-schema";
import { SharedRequestSchema, SharedResponseSchema } from "../zod-schema";

export const removeBg = async (opts: ISharedRequest) => {
	const { init_image, sync_timeout } = opts;
	const taskParameter = createSDKParameter({
		task: "/v1/sod",
		task_type: "mtlab",
		params: {},
		init_images: [createMediaProfile(init_image)],
		sync_timeout,
	});
	const { data } = await client.createTask(taskParameter);
	return parseResult(data);
};
/** @internal */
export const removeBgSchema = {
	request: SharedRequestSchema,
	response: SharedResponseSchema,
};
