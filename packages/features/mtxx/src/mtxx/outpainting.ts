import { client } from "../client";
import { createMediaProfile, createSDKParameter, parseResult } from "../utils";
import {
	OutpaintingRequestSchema,
	SharedResponseSchema,
	type ISharedResponse,
	type OutpaintingRequest,
} from "../zod-schema";

/**
 * Expands and extends the boundaries of an input image (AI outpainting/uncropping).
 *
 * @param {OutpaintingRequest} opts Options containing the input image, canvas expansion parameters, and optional sync timeout.
 * @returns {Promise<ISharedResponse>} A promise resolving to the expanded image result.
 */
export const outpainting = async (
	opts: OutpaintingRequest
): Promise<ISharedResponse> => {
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
