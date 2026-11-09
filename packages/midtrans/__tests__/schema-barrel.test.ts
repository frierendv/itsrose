import * as core from "../src/schema/core/index";
import * as error from "../src/schema/error/index";
import * as root from "../src/schema/index";
import * as invoice from "../src/schema/invoice/index";
import * as notification from "../src/schema/notification/index";
import * as paymentLink from "../src/schema/payment-link/index";
import * as shared from "../src/schema/shared/index";
import * as snap from "../src/schema/snap/index";
import * as subscription from "../src/schema/subscription/index";

const PARTS = {
	shared,
	core,
	invoice,
	notification,
	paymentLink,
	snap,
	subscription,
	error,
} as const;

describe("schema barrel", () => {
	it("has no duplicate value exports across schema families", () => {
		const owners = new Map<string, string[]>();

		for (const [part, module] of Object.entries(PARTS)) {
			for (const name of Object.keys(module)) {
				const parts = owners.get(name) ?? [];
				parts.push(part);
				owners.set(name, parts);
			}
		}

		const duplicates = [...owners.entries()].filter(
			([, parts]) => parts.length > 1
		);

		expect(duplicates).toEqual([]);
	});

	it("re-exports every family value from the root barrel", () => {
		const names = new Set(Object.keys(root));
		const missing: string[] = [];

		for (const [part, module] of Object.entries(PARTS)) {
			for (const name of Object.keys(module)) {
				if (!names.has(name)) {
					missing.push(`${part}:${name}`);
				}
			}
		}

		expect(missing).toEqual([]);
	});

	it("exposes the subscription primitives", () => {
		expect(root.SubscriptionScheduleSchema).toBeDefined();
		expect(root.SubscriptionIntervalUnitSchema).toBeDefined();
	});
});
