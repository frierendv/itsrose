import { fetcher } from "@itsrose/http-client";
import { ThirdPartyApiError } from "@itsrose/system";
import { Client } from "../client";
import {
	ReminiRequestSchema,
	ReminiResponseSchema,
	type ReminiRequest,
	type ReminiResponse,
} from "../zod-schema";

/**
 * Initialized remini client
 */
const client = new Client();

/**
 * Create a Remini task and wait for the processed result.
 *
 * @param {IReminiRequest} options - Input image and pipeline configuration.
 * @param {Client} [customClient] - Optional custom Client instance.
 * @returns {Promise<IReminiResponse>} The final Remini response payload.
 */
export const createTask = async (
	options: ReminiRequest,
	customClient?: Client
): Promise<ReminiResponse> => {
	const { init_image, pipelines } = options;
	const activeClient = customClient ?? client;

	let imageBuffer: Buffer;
	if (init_image.type === "url") {
		const { data } = await fetcher.get<ArrayBuffer>(init_image.value, {
			responseType: "arraybuffer",
		});
		imageBuffer = Buffer.from(data);
	} else {
		imageBuffer = Buffer.from(init_image.value, "base64");
	}

	const { status, error, result } = await activeClient.task.create(
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
