import { fetcher } from "@itsrose/http-client";
import { ThirdPartyApiError } from "@itsrose/system";
import { ReminiClient } from "../client";
import {
	ReminiRequestSchema,
	ReminiResponseSchema,
	type IReminiRequest,
	type IReminiResponse,
} from "../zod-schema";

/**
 * Initialized remini client
 */
const reminiClient = new ReminiClient();

/**
 * Create a Remini task and wait for the processed result.
 *
 * @param options - Input image and pipeline configuration.
 * @returns The final Remini response payload.
 */
export const createTask = async (
	options: IReminiRequest
): Promise<IReminiResponse> => {
	const { init_image, pipelines } = options;

	let imageBuffer: Buffer = Buffer.from(init_image.value, "base64");
	if (init_image.type === "url") {
		const { data } = await fetcher.get<Buffer>(init_image.value, {
			responseType: "arraybuffer",
		});
		imageBuffer = data;
	}

	const { status, error, result } = await reminiClient.task.create(
		imageBuffer,
		pipelines
	);

	if (status === "completed") {
		return {
			media_list: result.outputs.map((v) => v.url),
		};
	}
	throw new ThirdPartyApiError(
		error?.error_description || "Remini inference failed.",
		500
	);
};

export const createTaskSchema = {
	request: ReminiRequestSchema,
	response: ReminiResponseSchema,
};
