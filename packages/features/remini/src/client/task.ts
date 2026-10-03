import { InvalidRequestError, ThirdPartyApiError } from "@itsrose/system";
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

		const { data } = await this.client.post<{
			task_id?: string;
			upload_url?: string;
			upload_headers?: Record<string, string>;
		}>(
			"/v1/mobile/tasks",
			{
				...metadata,
				feature: {
					type: "multi-tool",
					pipelines: featurePipelines.map((pipeline) => ({
						...this.defaultFeature,
						...pipeline,
					})),
				},
			},
			{
				headers: this.client.iris.getHeaders(),
			}
		);

		const { task_id, upload_url, upload_headers } = data || {};
		if (!task_id || !upload_url) {
			throw new ThirdPartyApiError("Failed to create task.", 500);
		}

		const { status: uploadStatus } = await this.client.put(
			upload_url,
			initImageBuffer,
			{
				headers: upload_headers,
			}
		);

		if (uploadStatus !== 200) {
			throw new ThirdPartyApiError(
				"Image upload error.",
				uploadStatus ?? 400
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
		await this.client.post(`/v1/mobile/tasks/${taskId}/process`);

		await task.waitForOutput();

		if (!task.output) {
			throw new ThirdPartyApiError(
				"Processing failed. Please try again.",
				500
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
		} catch (err: any) {
			if (err?.status === 401 || err?.statusCode === 401) {
				await this.client.oracle.refresh();
				return await this._execute(initImageBuffer, featurePipelines);
			}
			throw err;
		}
	}
}
