/**
 * The execution status of a PixVerse generation task.
 *
 * PixVerse reports four states, and only two of them are terminal: a task
 * that is still `5` keeps going until it reaches `1`, `7` or `8`.
 */
export const PIXVERSE_TASK_STATUS = {
	/** Generation completed. The output URL is available. */
	completed: 1,
	/** Generating. Keep polling every 3-5 seconds. */
	generating: 5,
	/** Content moderation failed. Review the input before retrying. */
	moderation_failed: 7,
	/** Generation failed. */
	failed: 8,
} as const;

/**
 * A task status PixVerse answers with.
 */
export type PixverseTaskStatus =
	(typeof PIXVERSE_TASK_STATUS)[keyof typeof PIXVERSE_TASK_STATUS];

/**
 * The statuses after which a task will not change again.
 */
export const PIXVERSE_TERMINAL_TASK_STATUSES = {
	1: "completed",
	7: "moderation_failed",
	8: "failed",
} as const;

/**
 * Checks whether a task status is terminal.
 *
 * @param status The status the upstream answered with.
 * @returns True when the task neither generating nor waiting to be polled.
 */
export function isTerminalTaskStatus(status: number): boolean {
	return status in PIXVERSE_TERMINAL_TASK_STATUSES;
}
