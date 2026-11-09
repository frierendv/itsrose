import { Core } from "../../src/api/core";
import { Payment } from "../../src/api/core/payment";
import { Subscription } from "../../src/api/core/subscription";
import * as apiBarrel from "../../src/api/index";
import { Invoice } from "../../src/api/invoice";
import { PaymentLink } from "../../src/api/payment-link";
import { Snap } from "../../src/api/snap";
import { MidtransClient } from "../../src/client/client";
import * as clientBarrel from "../../src/client/index";
import { MidtransMerchant } from "../../src/client/merchant";
import {
	API_BASE_URL_PRODUCTION,
	API_BASE_URL_SANDBOX,
	SNAP_BASE_URL_PRODUCTION,
	SNAP_BASE_URL_SANDBOX,
} from "../../src/constants";
import * as rootBarrel from "../../src/index";
import type { ClientOptions } from "../../src/typings";

/**
 * The public client surface is frozen by the refactor plan. This suite fails
 * whenever a member is added, removed, renamed or changes arity, so any
 * intentional change must be reviewed and recorded here first.
 */
const CLIENT_MEMBERS = [
	"environment",
	"merchant",
	"core",
	"snap",
	"paymentLink",
	"invoice",
] as const;

interface FrozenService {
	readonly prototype: object;
	readonly arity: Readonly<Record<string, number>>;
}

const FROZEN_SERVICES: Readonly<Record<string, FrozenService>> = {
	MidtransClient: {
		prototype: MidtransClient.prototype,
		arity: {},
	},
	MidtransMerchant: {
		prototype: MidtransMerchant.prototype,
		arity: {
			createAuthKey: 0,
			createSignature: 1,
			generateOrderId: 1,
			verifySignature: 1,
		},
	},
	Core: {
		prototype: Core.prototype,
		arity: {},
	},
	Payment: {
		prototype: Payment.prototype,
		arity: {
			approve: 2,
			cancel: 2,
			capture: 2,
			charge: 2,
			deny: 2,
			directRefund: 3,
			expire: 2,
			refund: 3,
			status: 2,
			statusB2B: 3,
		},
	},
	Subscription: {
		prototype: Subscription.prototype,
		arity: {
			cancel: 2,
			create: 2,
			disable: 2,
			enable: 2,
			get: 2,
			update: 3,
		},
	},
	Snap: {
		prototype: Snap.prototype,
		arity: {
			create: 2,
			getPreferences: 1,
			status: 2,
			updatePreferences: 2,
		},
	},
	PaymentLink: {
		prototype: PaymentLink.prototype,
		arity: {
			create: 2,
			delete: 2,
			get: 2,
		},
	},
	Invoice: {
		prototype: Invoice.prototype,
		arity: {
			create: 2,
			get: 2,
			void: 2,
		},
	},
};

const ENV_KEYS = [
	"MIDTRANS_ENVIRONMENT",
	"MIDTRANS_MERCHANT_ID",
	"MIDTRANS_SERVER_KEY",
	"MIDTRANS_CLIENT_KEY",
] as const;

const ORIGINAL_ENV = new Map(
	ENV_KEYS.map((key) => [key, process.env[key]] as const)
);

function ownMethodNames(prototype: object): string[] {
	return Object.getOwnPropertyNames(prototype)
		.filter((name) => {
			if (name === "constructor" || name.startsWith("_")) {
				return false;
			}
			const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
			return typeof descriptor?.value === "function";
		})
		.sort();
}

function createClient(options: ClientOptions = {}): MidtransClient {
	return new MidtransClient({
		serverKey: "SB-Mid-server-surface-test",
		...options,
	});
}

afterEach(() => {
	for (const key of ENV_KEYS) {
		const value = ORIGINAL_ENV.get(key);
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
});

describe("MidtransClient public surface", () => {
	beforeEach(() => {
		delete process.env.MIDTRANS_ENVIRONMENT;
	});

	it("exposes exactly the frozen client members", () => {
		const client = createClient();
		expect(Object.keys(client)).toEqual([...CLIENT_MEMBERS]);
	});

	it("exposes the expected service instances", () => {
		const client = createClient();

		expect(client.merchant).toBeInstanceOf(MidtransMerchant);
		expect(client.core).toBeInstanceOf(Core);
		expect(client.core.payment).toBeInstanceOf(Payment);
		expect(client.core.subscription).toBeInstanceOf(Subscription);
		expect(client.snap).toBeInstanceOf(Snap);
		expect(client.paymentLink).toBeInstanceOf(PaymentLink);
		expect(client.invoice).toBeInstanceOf(Invoice);
		expect(Object.keys(client.core)).toEqual(["payment", "subscription"]);
	});

	it("keeps every service method name and arity", () => {
		for (const [label, service] of Object.entries(FROZEN_SERVICES)) {
			const expectedNames = Object.keys(service.arity).sort();
			expect({
				label,
				methods: ownMethodNames(service.prototype),
			}).toEqual({
				label,
				methods: expectedNames,
			});

			for (const [methodName, expectedArity] of Object.entries(
				service.arity
			)) {
				const method = (service.prototype as Record<string, unknown>)[
					methodName
				];
				if (typeof method !== "function") {
					throw new Error(
						`${label}.${methodName} is not a function on the prototype`
					);
				}
				expect({ label, methodName, arity: method.length }).toEqual({
					label,
					methodName,
					arity: expectedArity,
				});
			}
		}
	});

	it("keeps the merchant keys and hides the client key", () => {
		const client = createClient({
			merchantId: "G000000000",
			clientKey: "SB-Mid-client-surface-test",
		});

		expect(Object.keys(client.merchant)).toEqual([
			"merchantId",
			"baseUrl",
			"snapBaseUrl",
		]);
		expect(client.merchant.clientKey).toBe("SB-Mid-client-surface-test");
		expect(JSON.stringify(client.merchant)).not.toContain(
			"SB-Mid-client-surface-test"
		);
	});

	it("exports MidtransMerchant from the client barrel", () => {
		expect(clientBarrel.MidtransMerchant).toBe(MidtransMerchant);
	});

	it("exports the service base class from the api barrel", () => {
		expect(typeof apiBarrel.BaseService).toBe("function");
		expect(apiBarrel.SharedClient).toBe(apiBarrel.BaseService);
	});

	it("does not leak internal transport symbols from the root barrel", () => {
		expect("SHARED_CLIENT" in rootBarrel).toBe(false);
		expect("SHARED_HTTP_CLIENT" in rootBarrel).toBe(false);
	});

	it("builds the basic auth key from the server key", () => {
		const client = createClient();
		const expected = `Basic ${Buffer.from(
			"SB-Mid-server-surface-test:"
		).toString("base64")}`;

		expect(client.merchant.createAuthKey()).toBe(expected);
	});
});

describe("MidtransClient environment resolution", () => {
	beforeEach(() => {
		delete process.env.MIDTRANS_ENVIRONMENT;
		delete process.env.MIDTRANS_SERVER_KEY;
	});

	it("defaults to the sandbox environment", () => {
		const client = createClient();

		expect(client.environment).toBe("sandbox");
		expect(client.merchant.baseUrl).toBe(API_BASE_URL_SANDBOX);
		expect(client.merchant.snapBaseUrl).toBe(SNAP_BASE_URL_SANDBOX);
	});

	it("switches to production with isProduction", () => {
		const client = createClient({ isProduction: true });

		expect(client.environment).toBe("production");
		expect(client.merchant.baseUrl).toBe(API_BASE_URL_PRODUCTION);
		expect(client.merchant.snapBaseUrl).toBe(SNAP_BASE_URL_PRODUCTION);
	});

	it("maps the development environment to sandbox", () => {
		const client = createClient({ environment: "development" });

		expect(client.environment).toBe("sandbox");
		expect(client.merchant.baseUrl).toBe(API_BASE_URL_SANDBOX);
	});

	it("reads MIDTRANS_ENVIRONMENT when no option is provided", () => {
		process.env.MIDTRANS_ENVIRONMENT = "production";

		const client = createClient();

		expect(client.environment).toBe("production");
		expect(client.merchant.baseUrl).toBe(API_BASE_URL_PRODUCTION);
	});

	it("lets isProduction win over the environment variable", () => {
		process.env.MIDTRANS_ENVIRONMENT = "sandbox";

		const client = createClient({ isProduction: true });

		expect(client.environment).toBe("production");
	});

	it("rejects conflicting environment options", () => {
		expect(() =>
			createClient({ isProduction: true, environment: "sandbox" })
		).toThrow();

		expect(() =>
			createClient({ isProduction: false, environment: "production" })
		).toThrow();
	});

	it("rejects invalid base URLs", () => {
		expect(() => createClient({ baseUrl: "not-a-url" })).toThrow();
	});

	it("keeps custom base URLs", () => {
		const client = createClient({
			baseUrl: "https://core.example.test",
			snapBaseUrl: "https://snap.example.test",
		});

		expect(client.merchant.baseUrl).toBe("https://core.example.test");
		expect(client.merchant.snapBaseUrl).toBe("https://snap.example.test");
	});

	it("reads MIDTRANS_SERVER_KEY from the environment", () => {
		process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-from-env";

		const client = new MidtransClient();
		const expected = `Basic ${Buffer.from(
			"SB-Mid-server-from-env:"
		).toString("base64")}`;

		expect(client.merchant.createAuthKey()).toBe(expected);
	});

	it("throws when no server key is configured", () => {
		expect(() => new MidtransClient()).toThrow();
	});
});
