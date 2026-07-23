import { SyncState } from "../src/status/sync-state";

describe("shared/common", () => {
	it("defines SyncState enum values", () => {
		expect(SyncState.NOT_STARTED).toBe("not_started");
		expect(SyncState.IN_PROGRESS).toBe("in_progress");
		expect(SyncState.COMPLETED).toBe("completed");
		expect(SyncState.FAILED).toBe("failed");
	});
});
