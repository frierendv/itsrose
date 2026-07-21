import { InvalidRequestError, ThirdPartyApiError } from "@itsrose/system";
import { extractImageMetadata } from "../utils";
import type { IReminiPipelineFeature } from "../zod-schema";
import type { ReminiClient } from "./client";
import { TaskSocket } from "./task-socket";

export class Task {
	private readonly defaultFeature = {
		pre_scale_factor: 2.0,
		jpeg_quality: 80,
		interpolation: "bicubic",
		max_output_resolution: "3480",
		enlarge_small_images_to: "2048",
	};

	constructor(private readonly client: ReminiClient) {}

	private async _initialize(
		initImageBuffer: Buffer,
		featurePipelines: Partial<IReminiPipelineFeature>[]
	) {
		// Kick off user notification early to save round-trips
		const mePromise = this.client.getMe();
		const [isOk, metadata] = extractImageMetadata(initImageBuffer);
		if (!isOk) {
			throw new InvalidRequestError("image is not supported.");
		}
		await mePromise;
		const { data } = await this.client.http.post<any>("/v1/mobile/tasks", {
			...metadata,
			feature: {
				type: "multi-tool",
				pipelines: featurePipelines.map((pipeline) => ({
					...this.defaultFeature,
					...pipeline,
				})),
			},
		});
		const { task_id, upload_url, upload_headers } = data;
		if (!task_id) {
			throw new ThirdPartyApiError("Failed to create task.", 500);
		}
		const { status: uploadStatus } = await this.client.http.put(
			upload_url,
			initImageBuffer,
			{
				headers: upload_headers,
			}
		);
		if (uploadStatus !== 200) {
			throw new ThirdPartyApiError("Image upload error.", uploadStatus);
		}
		return task_id;
	}

	public async create(
		initImageBuffer: Buffer,
		featurePipelines: Partial<IReminiPipelineFeature>[]
	) {
		const taskId = await this._initialize(
			initImageBuffer,
			featurePipelines
		);
		const task = new TaskSocket(this.client.oracle);

		task.submit(taskId);
		await this.client.http.post(`/v1/mobile/tasks/${taskId}/process`);

		await task.waitForOutput();

		if (!task.output) {
			throw new ThirdPartyApiError(
				"Processing failed. Please try again.",
				500
			);
		}

		return task.output;
	}
}
