import { UpstreamApiError } from "@itsrose/upstream-client";
import {
	PixverseSyncState,
	PixverseTaskFailure,
} from "../constants/task-status";
import { getTask } from "../video/get-task";
import type { PixverseTaskResponse } from "../zod-schema";

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
	on_poll?: (task: PixverseTaskResponse) => void;
}

/**
 * The failure a task raises when it ends without a video.
 */
export class PixverseTaskError extends UpstreamApiError {
	/**
	 * The last state the task was seen in.
	 */
	public readonly task?: PixverseTaskResponse;

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
		task?: PixverseTaskResponse
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
 * A task is only complete when it publishes `completed` together with its
 * media; `failed` is terminal and is raised, carrying the reason. Polling
 * stops on any terminal state - a duplicate creation is never sent, and the
 * same task is never queried after it can no longer change.
 *
 * @param task_id The identifier a creation endpoint returned.
 * @param options Polling policy.
 * @returns The completed task, in the status vocabulary this package
 * publishes.
 * @throws {PixverseTaskError} When the task failed, failed moderation, or
 * did not finish within `timeout_ms`.
 * @throws {UpstreamApiError} When a query was refused by PixVerse.
 */
export async function waitForTask(
	task_id: string,
	options: WaitForTaskOptions = {}
): Promise<PixverseTaskResponse> {
	const { interval_ms = 3000, timeout_ms = 600000, on_poll } = options;

	const deadline = Date.now() + timeout_ms;
	let last: PixverseTaskResponse | undefined;

	for (;;) {
		const task = await getTask({ task_id });
		last = task;
		on_poll?.(task);

		if (task.status === PixverseSyncState.COMPLETED) {
			return task;
		}

		if (task.status === PixverseSyncState.FAILED) {
			throw new PixverseTaskError(
				task.error?.message ?? `PixVerse task ${task_id} failed.`,
				task.error?.type === PixverseTaskFailure.MODERATION ? 422 : 500,
				task
			);
		}

		if (Date.now() + interval_ms > deadline) {
			throw new PixverseTaskError(
				`PixVerse task ${task_id} did not finish within ${timeout_ms}ms.`,
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
