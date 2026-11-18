/**
 * The execution status of a PixVerse generation task.
 *
 * PixVerse reports four states, and only two of them are terminal: a task
 * that is still `5` keeps going until it reaches `1`, `7` or `8`.
 *
 * These are the *upstream* codes. They never leave this package: the public
 * payloads carry {@linkcode PixverseSyncState} instead.
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
 * The status a task is published with across the ITS Rose API surface.
 *
 * It is the same vocabulary `@itsrose/mtxx` publishes, so a caller can hold
 * a PixVerse task and an MTXX task in one type. It is defined here rather
 * than imported from the MTXX package, because a feature package must not
 * depend on a sibling feature package.
 */
export const PixverseSyncState = {
	/** The task has not started yet. */
	NOT_STARTED: "not_started",
	/** The task is being processed. Keep polling. */
	IN_PROGRESS: "in_progress",
	/** The task finished and the result is available. */
	COMPLETED: "completed",
	/** The task will not produce a result. */
	FAILED: "failed",
} as const;

/**
 * The status a task is published with.
 */
export type PixverseSyncState =
	(typeof PixverseSyncState)[keyof typeof PixverseSyncState];

/**
 * Why a task that failed failed.
 */
export const PixverseTaskFailure = {
	/** The input or output failed content moderation. */
	MODERATION: "moderation",
	/** The generation itself failed. */
	GENERATION: "generation",
} as const;

/**
 * Why a task that failed failed.
 */
export type PixverseTaskFailure =
	(typeof PixverseTaskFailure)[keyof typeof PixverseTaskFailure];

/**
 * The upstream status each published status corresponds to.
 */
const SYNC_STATE_BY_STATUS: Readonly<Record<number, PixverseSyncState>> = {
	[PIXVERSE_TASK_STATUS.completed]: PixverseSyncState.COMPLETED,
	[PIXVERSE_TASK_STATUS.generating]: PixverseSyncState.IN_PROGRESS,
	[PIXVERSE_TASK_STATUS.moderation_failed]: PixverseSyncState.FAILED,
	[PIXVERSE_TASK_STATUS.failed]: PixverseSyncState.FAILED,
};

/**
 * Translates an upstream task status into the published status.
 *
 * A code PixVerse adds later is neither reported as finished nor as failed:
 * it is published as `in_progress`, so a caller keeps polling instead of
 * treating an unknown state as a result.
 *
 * @param status The status the upstream answered with.
 * @returns The status the task is published with.
 */
export function toSyncState(status: number): PixverseSyncState {
	return SYNC_STATE_BY_STATUS[status] ?? PixverseSyncState.IN_PROGRESS;
}

/**
 * Checks whether an upstream task status is terminal.
 *
 * @param status The status the upstream answered with.
 * @returns True when the task will not change again.
 */
export function isTerminalTaskStatus(status: number): boolean {
	return (
		SYNC_STATE_BY_STATUS[status] === PixverseSyncState.COMPLETED ||
		SYNC_STATE_BY_STATUS[status] === PixverseSyncState.FAILED
	);
}
