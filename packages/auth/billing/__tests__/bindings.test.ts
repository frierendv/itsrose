import type { MidtransClient } from "@itsrose/midtrans";
import type { GenericEndpointContext } from "better-auth";
import {
	createBillingContext,
	createBillingServices,
	toBillingServiceOptions,
} from "../src/plugin/bindings";

const adapter = {
	findOne: jest.fn(),
	findMany: jest.fn(async () => []),
	create: jest.fn(),
	update: jest.fn(),
	delete: jest.fn(),
};

function createCtx() {
	return {
		context: { adapter, secondaryStorage: null },
	} as unknown as GenericEndpointContext;
}

describe("toBillingServiceOptions", () => {
	it("returns bare defaults without plugin options", () => {
		const options = toBillingServiceOptions(createCtx());
		expect(options).toEqual({
			defaultDueDays: undefined,
			autoSeedPlans: undefined,
			defaultPlans: undefined,
			hooks: undefined,
		});
	});

	it("forwards hooks with the endpoint context", () => {
		const calls: Array<[string, unknown, unknown]> = [];
		const record =
			(name: string) =>
			(payload: unknown, ctx: GenericEndpointContext) => {
				calls.push([name, payload, ctx]);
			};
		const ctx = createCtx();
		const options = toBillingServiceOptions(ctx, {
			defaultDueDays: 7,
			autoSeedPlans: false,
			onInvoiceCreated: record("created") as never,
			onInvoicePaid: record("paid") as never,
			onInvoiceVoided: record("voided") as never,
			onSubscriptionCreated: record("sub-created") as never,
			onSubscriptionUpdated: record("sub-updated") as never,
			onSubscriptionCanceled: record("sub-canceled") as never,
		});

		expect(options.defaultDueDays).toBe(7);
		expect(options.autoSeedPlans).toBe(false);

		const hooks = options.hooks;
		expect(hooks).toBeDefined();
		const invoice = { id: "invoice-1" };
		hooks?.onInvoiceCreated?.(invoice as never);
		hooks?.onInvoicePaid?.(invoice as never);
		hooks?.onInvoiceVoided?.(invoice as never);

		expect(calls.map(([name]) => name)).toEqual([
			"created",
			"paid",
			"voided",
		]);
		expect(calls[0]?.[2]).toBe(ctx);
	});
});

describe("service wiring", () => {
	it("creates repositories and options", () => {
		const services = createBillingServices(createCtx());
		expect(Object.keys(services.repositories).sort()).toEqual([
			"events",
			"invoices",
			"plans",
			"sequences",
			"subscriptions",
			"tenants",
			"users",
		]);
		expect(services.options.defaultDueDays).toBeUndefined();
	});

	it("creates the gateway dependencies for invoice flows", () => {
		const context = createBillingContext(
			createCtx(),
			{} as unknown as MidtransClient
		);
		expect(Object.keys(context.dependencies).sort()).toEqual([
			"clock",
			"gateway",
			"repositories",
			"unitOfWork",
		]);
		expect(typeof context.dependencies.gateway.generateOrderId).toBe(
			"function"
		);
		expect(Object.keys(context.dependencies.repositories)).toHaveLength(7);
	});
});
