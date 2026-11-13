import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createTransactionSignature } from "@itsrose/midtrans";
import {
	createMidtransPaymentGateway,
	mapInvoiceStatusToDomainStatus,
	mapTransactionStatusToInvoiceStatus,
} from "../src/adapter";
import { processWebhookEvent } from "../src/application/webhook.service";
import {
	INVOICE_TABLE_NAME,
	INVOICE_TYPE,
	SUBSCRIPTION_TABLE_NAME,
} from "../src/domain/constants";
import {
	INVOICE_STATUSES,
	InvoiceStatusSchema,
	isPaidInvoiceStatus,
	isVoidableStatus,
} from "../src/domain/invoice-status";
import { isDuplicatePaidWebhook } from "../src/domain/webhook.service";
import type { Subscription, TransactionInvoice } from "../src/types";
import {
	createMockDbAdapter,
	createMockEndpointContext,
	createMockMidtransClient,
	createTestDependencies,
	expectRow,
} from "./test-helpers";

const SERVER_KEY = "test_midtrans_server_key";

/**
 * Builds a Midtrans transaction notification with a valid signature.
 */
function buildNotification(
	orderId: string,
	grossAmount: string,
	transactionStatus: string,
	fraudStatus?: string
) {
	return {
		order_id: orderId,
		status_code: "200",
		gross_amount: grossAmount,
		transaction_status: transactionStatus,
		...(fraudStatus ? { fraud_status: fraudStatus } : {}),
		signature_key: createTransactionSignature(SERVER_KEY, {
			order_id: orderId,
			status_code: "200",
			gross_amount: grossAmount,
		}),
	};
}

function makeInvoice(
	overrides: Partial<TransactionInvoice> = {}
): TransactionInvoice {
	return {
		invoice_id: "INV-STATUS-1",
		user_id: "user-123",
		order_id: "ORD-STATUS-1",
		invoice_type: INVOICE_TYPE.NEW,
		target_tier: "pro",
		status: "pending",
		invoice_date: "2026-10-01T00:00:00.000Z",
		due_date: "2026-10-31T00:00:00.000Z",
		invoice_number: "INV-2026-0001",
		payment_type: "payment_link",
		gross_amount: 160_000,
		customer_details: null,
		item_details: null,
		...overrides,
	};
}

describe("invoice status vocabulary", () => {
	it("is exactly the glossary invoice status set", () => {
		expect([...INVOICE_STATUSES]).toEqual([
			"draft",
			"pending",
			"published",
			"expired",
			"overdue",
			"paid",
			"voided",
			"rejected",
			"canceled",
		]);
	});

	it("does not accept provider statuses", () => {
		for (const providerStatus of [
			"settlement",
			"capture",
			"authorize",
			"deny",
			"refund",
			"partial_refund",
			"chargeback",
			"expire",
			"failure",
			"void",
		]) {
			expect(InvoiceStatusSchema.safeParse(providerStatus).success).toBe(
				false
			);
		}
	});
});

describe("the shared 'is this paid?' predicate", () => {
	it("answers paid for the domain state and nothing else", () => {
		expect(isPaidInvoiceStatus("paid")).toBe(true);
		expect(isPaidInvoiceStatus("pending")).toBe(false);
		expect(isPaidInvoiceStatus("settlement")).toBe(false);
		expect(isPaidInvoiceStatus("PAID")).toBe(false);
		expect(isPaidInvoiceStatus(null)).toBe(false);
		expect(isPaidInvoiceStatus(undefined)).toBe(false);
	});

	it("backs the duplicate webhook check", () => {
		expect(isDuplicatePaidWebhook(makeInvoice({ status: "paid" }))).toBe(
			true
		);
		expect(isDuplicatePaidWebhook(makeInvoice({ status: "pending" }))).toBe(
			false
		);
	});
});

describe("voidability", () => {
	it("does not void a settled invoice", () => {
		expect(isVoidableStatus("paid")).toBe(false);
	});

	it("does not void invoices closed without payment", () => {
		expect(isVoidableStatus("voided")).toBe(false);
		expect(isVoidableStatus("canceled")).toBe(false);
		expect(isVoidableStatus("rejected")).toBe(false);
	});

	it("allows voiding an invoice that is still open", () => {
		expect(isVoidableStatus("draft")).toBe(true);
		expect(isVoidableStatus("pending")).toBe(true);
		expect(isVoidableStatus("published")).toBe(true);
		expect(isVoidableStatus("expired")).toBe(true);
		expect(isVoidableStatus("overdue")).toBe(true);
	});

	it("never treats a status outside the vocabulary as voidable", () => {
		expect(isVoidableStatus("settlement")).toBe(false);
		expect(isVoidableStatus("void")).toBe(false);
		expect(isVoidableStatus("")).toBe(false);
		expect(isVoidableStatus(null)).toBe(false);
		expect(isVoidableStatus(undefined)).toBe(false);
	});
});

describe("the Midtrans adapter maps provider statuses onto the domain vocabulary", () => {
	const cases: ReadonlyArray<
		[
			transactionStatus: string | undefined,
			fraudStatus: string | undefined,
			expected: string,
		]
	> = [
		["settlement", undefined, "paid"],
		["capture", "accept", "paid"],
		["capture", undefined, "paid"],
		["capture", "challenge", "pending"],
		["capture", "deny", "rejected"],
		["authorize", "accept", "pending"],
		["authorize", "challenge", "pending"],
		["authorize", "deny", "rejected"],
		["pending", "accept", "pending"],
		["pending", "challenge", "pending"],
		["pending", "deny", "rejected"],
		["deny", undefined, "rejected"],
		["failure", undefined, "rejected"],
		["cancel", undefined, "canceled"],
		["expire", undefined, "expired"],
		["refund", undefined, "paid"],
		["partial_refund", undefined, "paid"],
		["chargeback", undefined, "paid"],
		["partial_chargeback", undefined, "paid"],
		["something_else", undefined, "pending"],
		[undefined, undefined, "pending"],
	];

	it("maps every provider status onto the domain vocabulary", () => {
		for (const [transactionStatus, fraudStatus, expected] of cases) {
			expect({
				transactionStatus,
				fraudStatus,
				actual: mapTransactionStatusToInvoiceStatus(
					transactionStatus,
					fraudStatus
				),
				expected,
			}).toEqual({
				transactionStatus,
				fraudStatus,
				actual: expected,
				expected,
			});
		}
	});

	it("exposes the normalised status through the notification context", () => {
		const client = createMockMidtransClient(SERVER_KEY);
		const gateway = createMidtransPaymentGateway(client);

		const context = gateway.parseNotification(
			buildNotification("ORD-1", "160000", "settlement")
		);

		expect(context.status).toBe("paid");
		expect(context.orderId).toBe("ORD-1");
	});

	it("narrows a remote invoice status instead of casting it", () => {
		expect(mapInvoiceStatusToDomainStatus("paid")).toBe("paid");
		expect(mapInvoiceStatusToDomainStatus("settlement")).toBeNull();
		expect(mapInvoiceStatusToDomainStatus(null)).toBeNull();
	});
});

describe("webhook settlement", () => {
	async function settleWithGatewayRead(
		gatewayRead: "fails" | "empty"
	): Promise<{
		result: Awaited<ReturnType<typeof processWebhookEvent>>;
		invoice: TransactionInvoice;
		subscription: Subscription | null;
	}> {
		const adapter = createMockDbAdapter();
		const client = createMockMidtransClient(SERVER_KEY);
		const orderId = "ORD-STATUS-1";
		const invoiceId = "INV-STATUS-1";

		await adapter.create({
			model: INVOICE_TABLE_NAME,
			data: makeInvoice({
				invoice_id: invoiceId,
				order_id: orderId,
			}),
		});

		if (gatewayRead === "fails") {
			// A transient gateway failure: the adapter turns it into "no remote
			// data" instead of aborting the webhook.
			client.invoice.get = (async () => {
				throw new Error("gateway read failed");
			}) as unknown as typeof client.invoice.get;
		}

		const ctx = createMockEndpointContext({ adapter });
		const dependencies = createTestDependencies(ctx, client);

		if (gatewayRead === "empty") {
			dependencies.gateway.getInvoice = async () => null;
		}

		const result = await processWebhookEvent(
			dependencies,
			buildNotification(orderId, "160000", "settlement")
		);

		const invoice = expectRow(
			await adapter.findOne<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				where: [{ field: "invoice_id", value: invoiceId }],
			})
		);

		const subscription = await adapter.findOne<Subscription>({
			model: SUBSCRIPTION_TABLE_NAME,
			where: [{ field: "user_id", value: "user-123" }],
		});

		return { result, invoice, subscription };
	}

	it("settles the subscription even when the gateway read throws", async () => {
		const { result, invoice, subscription } =
			await settleWithGatewayRead("fails");

		expect(result.status).toBe("processed");
		expect(result.status === "processed" && result.finalStatus).toBe(
			"paid"
		);
		expect(invoice.status).toBe("paid");
		expect(subscription).not.toBeNull();
		expect(subscription?.status).toBe("active");
	});

	it("settles the subscription when the gateway read returns nothing", async () => {
		const { result, invoice, subscription } =
			await settleWithGatewayRead("empty");

		expect(result.status).toBe("processed");
		expect(result.status === "processed" && result.finalStatus).toBe(
			"paid"
		);
		expect(invoice.status).toBe("paid");
		expect(subscription).not.toBeNull();
	});
});

describe("the domain never sees a provider status", () => {
	const sourceDirectory = join(__dirname, "..", "src");

	function collectSourceFiles(directory: string): string[] {
		return readdirSync(directory, { withFileTypes: true }).flatMap(
			(entry) => {
				const entryPath = join(directory, entry.name);

				if (entry.isDirectory()) {
					return collectSourceFiles(entryPath);
				}

				return entry.name.endsWith(".ts") ? [entryPath] : [];
			}
		);
	}

	it("keeps provider status strings out of the domain and application layers", () => {
		const forbidden = [
			'"settlement"',
			'"capture"',
			'"authorize"',
			'"partial_refund"',
			'"partial_chargeback"',
			'"chargeback"',
			'"deny"',
		];

		const offenders: string[] = [];

		for (const layer of ["domain", "application"]) {
			const files = collectSourceFiles(join(sourceDirectory, layer));

			for (const file of files) {
				const source = readFileSync(file, "utf8");
				const relative = file.slice(sourceDirectory.length + 1);

				for (const literal of forbidden) {
					if (source.includes(literal)) {
						offenders.push(`${relative} contains ${literal}`);
					}
				}
			}
		}

		expect(offenders).toEqual([]);
	});
});
