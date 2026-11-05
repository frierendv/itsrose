import {
	buildCronOutcome,
	buildFlushOutcome,
	buildTenantSyncOutcome,
} from "../models";

describe("operation outcomes", () => {
	it("formats a flush result", () => {
		const outcome = buildFlushOutcome({
			days: ["2026-11-04", "2026-11-05"],
			tenants: 3,
			rows: 12,
			written: 10,
		});
		expect(outcome.fields).toEqual([
			{ label: "Days", value: "2026-11-04, 2026-11-05" },
			{ label: "Tenants", value: "3" },
			{ label: "Rows read", value: "12" },
			{ label: "Rows written", value: "10" },
		]);
		expect(outcome.errors).toEqual([]);
	});

	it("formats a tenant sync result", () => {
		expect(
			buildTenantSyncOutcome({ scanned: 9, created: 2 }).fields
		).toEqual([
			{ label: "Users scanned", value: "9" },
			{ label: "Tenants created", value: "2" },
		]);
	});

	it("surfaces cron errors with their task and id", () => {
		const outcome = buildCronOutcome({
			dispatched_renewals: 4,
			tracked_grace_periods: 1,
			swept_expired: 2,
			errors: [{ task: "renewal", id: "sub-1", error: "gateway down" }],
		});
		expect(outcome.errors).toEqual(["renewal (sub-1): gateway down"]);
		expect(
			outcome.fields.find(
				(field) => field.label === "Renewals dispatched"
			)?.value
		).toBe("4");
	});
});
