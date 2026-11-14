import {
	parseUpstreamPayload,
	UpstreamApiError,
} from "@itsrose/upstream-client";
import { assetClient, client, type Client } from "../client";
import {
	ReminiRequestSchema,
	ReminiResponseSchema,
	type IReminiRequest,
	type IReminiResponse,
} from "../zod-schema";

/**
 * Create a Remini task and wait for the processed result.
 *
 * @param {IReminiRequest} options - Input image and pipeline configuration.
 * @param {Client} [customClient] - Optional custom Client instance.
 * @returns {Promise<IReminiResponse>} The final Remini response payload.
 * @throws {UpstreamApiError} If the upstream call failed or the result did
 * not match the published schema.
 */
export const createTask = async (
	options: IReminiRequest,
	customClient?: Client
): Promise<IReminiResponse> => {
	const { init_image, pipelines } = options;
	const activeClient = customClient ?? client;

	let imageBuffer: Buffer;
	if (init_image.type === "url") {
		const downloaded = await assetClient.send<Buffer>({
			url: init_image.value,
			responseType: "arraybuffer",
		});
		imageBuffer = Buffer.from(downloaded);
	} else {
		imageBuffer = Buffer.from(init_image.value, "base64");
	}

	const { status, error, result } = await activeClient.task.create(
		imageBuffer,
		pipelines
	);

	if (status === "completed") {
		return parseUpstreamPayload(
			ReminiResponseSchema,
			{ media_list: result.outputs.map((v) => v.url) },
			{ service: "remini", label: "task" }
		);
	}
	throw new UpstreamApiError(
		error?.error_description || "Remini inference failed.",
		500,
		{ service: "remini" }
	);
};

export const createTaskSchema = {
	request: ReminiRequestSchema,
	response: ReminiResponseSchema,
};
