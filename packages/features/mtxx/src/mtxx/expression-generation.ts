import { client } from "../client";
import { createMediaProfile, createSDKParameter, parseResult } from "../utils";
import {
	ExpressionGenerationRequestSchema,
	SharedResponseSchema,
	type IExpressionGenerationRequest,
	type ISharedResponse,
} from "../zod-schema";

export const expressionGeneration = async (
	opts: IExpressionGenerationRequest
): Promise<ISharedResponse> => {
	const { init_image, sync_timeout, ...parameter } = opts;
	const taskParameter = createSDKParameter({
		task: "/v1/beauty_smile",
		task_type: "mtlab",
		params: parameter,
		init_images: [createMediaProfile(init_image)],
		sync_timeout,
	});
	const { data } = await client.createTask(taskParameter);
	return parseResult(data);
};

/** @internal */
export const expressionGenerationSchema = {
	request: ExpressionGenerationRequestSchema,
	response: SharedResponseSchema,
};
