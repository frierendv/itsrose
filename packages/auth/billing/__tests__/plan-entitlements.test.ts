import {
	API_PLAN_TABLE_NAME,
	BILLING_PLANS,
	BUSINESS_PLAN,
	FREE_PLAN,
	HOBBY_PLAN,
	PRO_PLAN,
} from "../src/domain/constants";
import {
	DEFAULT_PLAN_ENTITLEMENTS,
	resolvePlanEntitlements,
} from "../src/domain/entitlements";
import {
	buildCreatePlanData,
	buildPlanUpdateData,
	buildSeedPlanData,
	normalizePlan,
} from "../src/domain/plan.service";
import {
	apiPlanSchema,
	createPlanSchema,
	updatePlanSchema,
} from "../src/schema";
import type { ApiPlan } from "../src/types";

const entitlementsField =
	apiPlanSchema[API_PLAN_TABLE_NAME].fields.entitlements;

const VALID_ENTITLEMENTS = {
	storage_bytes: 104_857_600,
	storage_assets: 25,
};

const LEGACY_PRICE = { amount: 0, currency: "IDR", interval: "month" };

function legacyRow(overrides: Record<string, unknown> = {}) {
	return {
		plan_id: "free",
		name: "Free",
		description: null,
		price: LEGACY_PRICE,
		features: [],
		limits: { max: 10, timeWindow: 60_000 },
		quota_requests: 10_000,
		highlighted: false,
		...overrides,
	};
}

describe("the plan entitlements default", () => {
	it("means unlimited on both keys", () => {
		expect(DEFAULT_PLAN_ENTITLEMENTS).toEqual({
			storage_bytes: null,
			storage_assets: null,
		});
	});
});

describe("resolvePlanEntitlements", () => {
	it("reads a stored entitlements object", () => {
		expect(resolvePlanEntitlements(VALID_ENTITLEMENTS)).toEqual(
			VALID_ENTITLEMENTS
		);
	});

	it("reads the stored JSON string form of the object", () => {
		expect(
			resolvePlanEntitlements(JSON.stringify(VALID_ENTITLEMENTS))
		).toEqual(VALID_ENTITLEMENTS);
	});

	it("keeps zero: it is a real limit, not a missing value", () => {
		expect(
			resolvePlanEntitlements({ storage_bytes: 0, storage_assets: 0 })
		).toEqual({ storage_bytes: 0, storage_assets: 0 });
	});

	it("keeps an explicit null as unlimited", () => {
		expect(
			resolvePlanEntitlements({
				storage_bytes: null,
				storage_assets: null,
			})
		).toEqual(DEFAULT_PLAN_ENTITLEMENTS);
	});

	it("defaults a missing key while keeping the sibling", () => {
		expect(resolvePlanEntitlements({ storage_bytes: 512 })).toEqual({
			storage_bytes: 512,
			storage_assets: null,
		});
	});

	it.each([
		["a missing value", undefined],
		["a null value", null],
		["an empty stored value", ""],
		["an empty object", "{}"],
		["a non-object JSON value", "null"],
		["invalid JSON", "{not json"],
		["a JSON array", "[1,2,3]"],
	])("falls back to the defaults for %s", (_label, stored) => {
		expect(resolvePlanEntitlements(stored)).toEqual(
			DEFAULT_PLAN_ENTITLEMENTS
		);
	});

	it.each([
		["a negative number", -1],
		["a fractional number", 1.5],
		["a numeric string", "1024"],
		["a boolean", true],
		["an object", { value: 1 }],
		["NaN", Number.NaN],
	])("falls back to unlimited for %s", (_label, invalid) => {
		expect(
			resolvePlanEntitlements({
				storage_bytes: invalid,
				storage_assets: invalid,
			})
		).toEqual(DEFAULT_PLAN_ENTITLEMENTS);
	});

	it("keeps a valid key when its sibling is invalid", () => {
		expect(
			resolvePlanEntitlements({
				storage_bytes: -5,
				storage_assets: 3,
			})
		).toEqual({ storage_bytes: null, storage_assets: 3 });
	});

	it("ignores keys it does not know", () => {
		expect(
			resolvePlanEntitlements({
				storage_bytes: 1,
				storage_assets: 2,
				storage_requests: 3,
			})
		).toEqual({ storage_bytes: 1, storage_assets: 2 });
	});
});

describe("the api_plans.entitlements column", () => {
	it("round-trips an object through the stored JSON string", () => {
		const stored = entitlementsField.transform.input(VALID_ENTITLEMENTS);

		expect(stored).toBe(JSON.stringify(VALID_ENTITLEMENTS));
		expect(entitlementsField.transform.output(stored)).toEqual(
			VALID_ENTITLEMENTS
		);
	});

	it("reads a legacy row with no stored value as the defaults", () => {
		expect(entitlementsField.transform.output(undefined)).toEqual(
			DEFAULT_PLAN_ENTITLEMENTS
		);
	});

	it("reads invalid stored JSON as the defaults instead of throwing", () => {
		expect(entitlementsField.transform.output("{not json")).toEqual(
			DEFAULT_PLAN_ENTITLEMENTS
		);
	});

	it("resolves invalid stored values to unlimited", () => {
		expect(
			entitlementsField.transform.output(
				JSON.stringify({ storage_bytes: -1, storage_assets: 2.5 })
			)
		).toEqual(DEFAULT_PLAN_ENTITLEMENTS);
	});
});

describe("the create/update plan schemas", () => {
	it("accept an entitlements object with either limit or null", () => {
		expect(
			createPlanSchema.safeParse({
				plan_id: "pro",
				name: "Pro",
				entitlements: { storage_bytes: 0, storage_assets: null },
			}).success
		).toBe(true);

		expect(
			updatePlanSchema.safeParse({
				plan_id: "pro",
				entitlements: { storage_bytes: null, storage_assets: 10 },
			}).success
		).toBe(true);
	});

	it("accept a payload that omits entitlements", () => {
		expect(
			createPlanSchema.safeParse({ plan_id: "free", name: "Free" })
				.success
		).toBe(true);
		expect(updatePlanSchema.safeParse({ plan_id: "free" }).success).toBe(
			true
		);
	});

	it("reject a negative limit", () => {
		expect(
			createPlanSchema.safeParse({
				plan_id: "free",
				name: "Free",
				entitlements: { storage_bytes: -1, storage_assets: null },
			}).success
		).toBe(false);
	});

	it("reject a fractional limit", () => {
		expect(
			updatePlanSchema.safeParse({
				plan_id: "free",
				entitlements: { storage_bytes: null, storage_assets: 2.5 },
			}).success
		).toBe(false);
	});

	it("reject a non-numeric limit", () => {
		expect(
			createPlanSchema.safeParse({
				plan_id: "free",
				name: "Free",
				entitlements: { storage_bytes: "1024", storage_assets: null },
			}).success
		).toBe(false);
	});
});

describe("building plan rows", () => {
	it("persists the defaults when create omits entitlements", () => {
		const row = buildCreatePlanData({ plan_id: "free", name: "Free" });

		expect(row.entitlements).toEqual(DEFAULT_PLAN_ENTITLEMENTS);
	});

	it("persists the supplied entitlements on create", () => {
		const row = buildCreatePlanData({
			plan_id: "pro",
			name: "Pro",
			entitlements: VALID_ENTITLEMENTS,
		});

		expect(row.entitlements).toEqual(VALID_ENTITLEMENTS);
	});

	it("leaves entitlements out of an update that omits them", () => {
		expect(
			buildPlanUpdateData({ plan_id: "pro" }).entitlements
		).toBeUndefined();
	});

	it("writes the supplied entitlements on update", () => {
		expect(
			buildPlanUpdateData({
				plan_id: "pro",
				entitlements: { storage_bytes: 10, storage_assets: null },
			}).entitlements
		).toEqual({ storage_bytes: 10, storage_assets: null });
	});

	it("seeds the built-in catalog with the defaults", () => {
		expect(buildSeedPlanData(PRO_PLAN).entitlements).toEqual(
			DEFAULT_PLAN_ENTITLEMENTS
		);
	});
});

describe("normalizePlan", () => {
	it("resolves a legacy row that predates the entitlements column", () => {
		expect(normalizePlan(legacyRow()).entitlements).toEqual(
			DEFAULT_PLAN_ENTITLEMENTS
		);
	});

	it("resolves entitlements stored as a JSON string on the row", () => {
		const plan = normalizePlan(
			legacyRow({ entitlements: JSON.stringify(VALID_ENTITLEMENTS) })
		);

		expect(plan.entitlements).toEqual(VALID_ENTITLEMENTS);
	});

	it("resolves invalid stored entitlements to the defaults", () => {
		const plan = normalizePlan(legacyRow({ entitlements: "{not json" }));

		expect(plan.entitlements).toEqual(DEFAULT_PLAN_ENTITLEMENTS);
	});
});

describe("the seeded plans", () => {
	const seeds: readonly ApiPlan<true>[] = [
		FREE_PLAN,
		HOBBY_PLAN,
		PRO_PLAN,
		BUSINESS_PLAN,
	];

	it("satisfy ApiPlan and carry the defaults", () => {
		expect(BILLING_PLANS).toEqual(seeds);

		for (const plan of seeds) {
			expect(plan.entitlements).toEqual(DEFAULT_PLAN_ENTITLEMENTS);
		}
	});
});
