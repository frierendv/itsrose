import { FREE_PLAN } from "../src/domain/constants";
import { createPlanSchema, planPriceInputSchema } from "../src/schema";

describe("the plan price schema", () => {
	it("accepts a zero price", () => {
		// The free tier is priced at 0 and the seed path writes it, so the
		// schema must accept a price the system itself creates.
		const parsed = planPriceInputSchema.safeParse({
			amount: 0,
			currency: "IDR",
			interval: "month",
		});

		expect(parsed.success).toBe(true);
	});

	it("accepts the seeded free plan's own price", () => {
		expect(FREE_PLAN.price.amount).toBe(0);

		const parsed = createPlanSchema.safeParse({
			plan_id: FREE_PLAN.plan_id,
			name: FREE_PLAN.name,
			prices: [FREE_PLAN.price],
		});

		expect(parsed.success).toBe(true);
	});

	it("still rejects a negative price", () => {
		const parsed = planPriceInputSchema.safeParse({
			amount: -1,
			currency: "IDR",
			interval: "month",
		});

		expect(parsed.success).toBe(false);
	});

	it("still rejects a fractional price", () => {
		const parsed = planPriceInputSchema.safeParse({
			amount: 1500.5,
			currency: "IDR",
			interval: "month",
		});

		expect(parsed.success).toBe(false);
	});
});
