import { client } from "../client";
import { createMediaProfile, createSDKParameter, parseResult } from "../utils";
import type { ISharedRequest, ISharedResponse } from "../zod-schema";
import { SharedRequestSchema, SharedResponseSchema } from "../zod-schema";

/**
 * Removes the background from an input image using Salient Object Detection (SOD).
 *
 * @param {ISharedRequest} opts Options containing the input image and optional sync timeout.
 * @returns {Promise<ISharedResponse>} A promise resolving to the foreground result with background removed.
 */
export const removeBg = async (
	opts: ISharedRequest
): Promise<ISharedResponse> => {
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
