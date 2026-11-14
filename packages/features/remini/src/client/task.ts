import { InvalidRequestError } from "@itsrose/system";
import {
	isUpstreamApiError,
	neverRetry,
	UpstreamApiError,
} from "@itsrose/upstream-client";
import { extractImageMetadata } from "../utils";
import type { IReminiPipelineFeature } from "../zod-schema";
import type { Client } from "./client";
import { TaskSocket } from "./task-socket";

export class Task {
	private readonly defaultFeature = {
		pre_scale_factor: 2.0,
		jpeg_quality: 80,
		interpolation: "bicubic",
		max_output_resolution: "3480",
		enlarge_small_images_to: "2048",
	};

	constructor(private readonly client: Client) {}

	private async _initialize(
		initImageBuffer: Buffer,
		featurePipelines: Partial<IReminiPipelineFeature>[]
	): Promise<string> {
		const [isOk, metadata] = extractImageMetadata(initImageBuffer);
		if (!isOk) {
			throw new InvalidRequestError("image is not supported.");
		}
		await this.client.ensureInitialized();
		await this.client.user.getMe();

		const data = await this.client.send<{
			task_id?: string;
			upload_url?: string;
			upload_headers?: Record<string, string>;
		}>({
			url: "/v1/mobile/tasks",
			method: "post",
			data: {
				...metadata,
				feature: {
					type: "multi-tool",
					pipelines: featurePipelines.map((pipeline) => ({
						...this.defaultFeature,
						...pipeline,
					})),
				},
			},
			headers: this.client.iris.getHeaders(),
			// The call creates a task upstream: it must not be replayed.
			retry: { retryCondition: neverRetry },
		});

		const { task_id, upload_url, upload_headers } = data || {};
		if (!task_id || !upload_url) {
			throw new UpstreamApiError("Failed to create task.", 500, {
				service: "remini",
			});
		}

		const { status: uploadStatus } = await this.client
			.sendWithResponse({
				url: upload_url,
				method: "put",
				data: initImageBuffer,
				headers: upload_headers,
			})
			.catch((error: unknown) => {
				// The upload answers with the status it failed with; the
				// caller is told about the upload, not about the transport.
				throw new UpstreamApiError(
					"Image upload error.",
					isUpstreamApiError(error) && error.upstreamStatus
						? error.upstreamStatus
						: 400,
					{ service: "remini", cause: error }
				);
			});

		if (uploadStatus !== 200) {
			throw new UpstreamApiError(
				"Image upload error.",
				uploadStatus ?? 400,
				{ service: "remini" }
			);
		}

		return task_id;
	}

	private async _execute(
		initImageBuffer: Buffer,
		featurePipelines: Partial<IReminiPipelineFeature>[]
	) {
		const taskId = await this._initialize(
			initImageBuffer,
			featurePipelines
		);
		const task = new TaskSocket(this.client);

		task.submit(taskId);
		await this.client.send({
			url: `/v1/mobile/tasks/${taskId}/process`,
			method: "post",
			// The call starts the processing upstream: it must not be
			// replayed.
			retry: { retryCondition: neverRetry },
		});

		await task.waitForOutput();

		if (!task.output) {
			throw new UpstreamApiError(
				"Processing failed. Please try again.",
				500,
				{ service: "remini" }
			);
		}

		return task.output;
	}

	public async create(
		initImageBuffer: Buffer,
		featurePipelines: Partial<IReminiPipelineFeature>[]
	) {
		try {
			return await this._execute(initImageBuffer, featurePipelines);
		} catch (err: unknown) {
			if (isUnauthorizedError(err)) {
				await this.client.oracle.refresh();
				return await this._execute(initImageBuffer, featurePipelines);
			}
			throw err;
		}
	}
}

/**
 * Detects an unauthorized failure (HTTP 401) in an unknown error payload.
 *
 * @param error Unknown error payload thrown by the client.
 * @returns True when the payload carries a 401 status.
 */
function isUnauthorizedError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) {
		return false;
	}

	if ("status" in error && error.status === 401) {
		return true;
	}

	return "statusCode" in error && error.statusCode === 401;
}
