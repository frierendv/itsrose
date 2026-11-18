import { UpstreamApiError } from "@itsrose/upstream-client";
import { isTerminalTaskStatus, PIXVERSE_TASK_STATUS } from "../constants";
import { getTask } from "../video/get-task";
import type { PixverseTaskResult } from "../zod-schema";

/**
 * Options of {@linkcode waitForTask}.
 */
export interface WaitForTaskOptions {
	/**
	 * Delay between two queries, in milliseconds.
	 *
	 * PixVerse asks for 3-5 seconds while a task is generating.
	 * @default 3000
	 */
	interval_ms?: number;

	/**
	 * How long to wait before giving up, in milliseconds.
	 * @default 600000
	 */
	timeout_ms?: number;

	/**
	 * Called with every state the task is seen in, including the terminal
	 * one. Useful for progress reporting.
	 */
	on_poll?: (result: PixverseTaskResult) => void;
}

/**
 * The failure a task raises when it ends without a video.
 */
export class PixverseTaskError extends UpstreamApiError {
	/**
	 * The last state the task was seen in.
	 */
	public readonly task?: PixverseTaskResult;

	/**
	 * Creates a new {@linkcode PixverseTaskError}.
	 *
	 * @param message Human-readable description of the failure.
	 * @param statusCode Status our own API answers with.
	 * @param task The last state the task was seen in.
	 */
	constructor(
		message: string,
		statusCode: number,
		task?: PixverseTaskResult
	) {
		super(message, statusCode, {
			service: "pixverse",
			details: task,
		});

		Object.setPrototypeOf(this, new.target.prototype);

		this.task = task;
	}
}

/**
 * Polls a generation task until it is terminal.
 *
 * A task is only complete when PixVerse answers `status=1` and the output
 * URL is there; `7` (moderation failed) and `8` (generation failed) are
 * terminal failures and are raised. Polling is stopped on any terminal
 * state - a duplicate creation is never sent, and the same task is never
 * queried after it can no longer change.
 *
 * @param video_id The identifier a creation endpoint returned.
 * @param options Polling policy.
 * @returns The completed task.
 * @throws {PixverseTaskError} When the task failed, failed moderation, or
 * did not finish within `timeout_ms`.
 * @throws {UpstreamApiError} When a query was refused by PixVerse.
 */
export async function waitForTask(
	video_id: number | string,
	options: WaitForTaskOptions = {}
): Promise<PixverseTaskResult> {
	const { interval_ms = 3000, timeout_ms = 600000, on_poll } = options;

	const deadline = Date.now() + timeout_ms;
	let last: PixverseTaskResult | undefined;

	for (;;) {
		const result = await getTask(video_id);
		last = result;
		on_poll?.(result);

		if (result.status === PIXVERSE_TASK_STATUS.completed) {
			return result;
		}

		if (isTerminalTaskStatus(result.status)) {
			throw new PixverseTaskError(
				result.status === PIXVERSE_TASK_STATUS.moderation_failed
					? `PixVerse refused task ${video_id}: content moderation failed.`
					: `PixVerse task ${video_id} failed.`,
				422,
				result
			);
		}

		if (Date.now() + interval_ms > deadline) {
			throw new PixverseTaskError(
				`PixVerse task ${video_id} did not finish within ${timeout_ms}ms.`,
				504,
				last
			);
		}

		await sleep(interval_ms);
	}
}

/**
 * Waits for a delay.
 *
 * @param ms Delay in milliseconds.
 * @returns A promise resolved after the delay.
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
