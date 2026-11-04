/**
 * Represents the status of an asynchronous synchronization process.
 */
export enum SyncState {
	/** The sync process has not yet started. */
	NOT_STARTED = "not_started",
	/** The sync process is currently in progress. */
	IN_PROGRESS = "in_progress",
	/** The sync process has completed successfully. */
	COMPLETED = "completed",
	/** The sync process has failed. */
	FAILED = "failed",
}
