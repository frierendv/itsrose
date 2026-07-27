import { client } from "../client";
import { createMediaProfile, createSDKParameter, parseResult } from "../utils";
import {
	ImageRestorationRequestSchema,
	SharedResponseSchema,
	type IImageRestorationRequest,
	type ISharedResponse,
} from "../zod-schema";

/**
 * Restores and enhances low-quality, degraded, or blurry input images.
 *
 * @param {IImageRestorationRequest} opts Options containing the input image, restoration parameters, and optional sync timeout.
 * @returns {Promise<ISharedResponse>} A promise resolving to the enhanced image result.
 */
export const imageRestoration = async (
	opts: IImageRestorationRequest
): Promise<ISharedResponse> => {
	const { init_image, sync_timeout, ...params } = opts;
	const taskParameter = createSDKParameter({
		task: "/v2/image_restoration",
		task_type: "mtlab",
		params,
		init_images: [createMediaProfile(init_image)],
		sync_timeout,
	});

	const { data } = await client.createTask(taskParameter);
	return parseResult(data);
};
/** @internal */
export const imageRestorationSchema = {
	request: ImageRestorationRequestSchema,
	response: SharedResponseSchema,
};
