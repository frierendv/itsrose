import { client } from "../client";
import { createMediaProfile, createSDKParameter, parseResult } from "../utils";
import {
	OutpaintingRequestSchema,
	SharedResponseSchema,
	type OutpaintingRequest,
} from "../zod-schema";

export const outpainting = async (opts: OutpaintingRequest) => {
	const { init_image, sync_timeout, ...parameter } = opts;
	const taskParameter = createSDKParameter({
		task: "/v1/mtimage_expand_whee_async",
		task_type: "mtlab",
		params: {
			parameter: {
				...parameter,
				generate_num: 1,
			},
		},
		init_images: [createMediaProfile(init_image)],
		sync_timeout,
	});
	const { data } = await client.createTask(taskParameter);
	return parseResult(data);
};
/** @internal */
export const outpaintingSchema = {
	request: OutpaintingRequestSchema,
	response: SharedResponseSchema,
};
