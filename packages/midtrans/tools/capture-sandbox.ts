import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { API_BASE_URL_SANDBOX, SNAP_BASE_URL_SANDBOX } from "../src/constants";
import { sanitizeFixtureBody } from "./sanitize";

const FIXTURES_DIR = fileURLToPath(new URL("../fixtures", import.meta.url));

interface CaptureSpec {
	readonly name: string;
	/** Stable, sanitized endpoint template recorded in `_meta`. */
	readonly endpoint: string;
	readonly method: "GET" | "POST" | "PATCH" | "DELETE";
	readonly path?: string;
	readonly base?: "api" | "snap";
	readonly body?: unknown;
	readonly headers?: Record<string, string>;
	/** HTTP statuses that indicate the scenario behaved as intended. */
	readonly expectedStatus?: readonly number[];
}

interface CaptureResult {
	readonly status: number;
	readonly body: unknown;
}

function resolveConfig(): { serverKey: string } {
	const environment = process.env.MIDTRANS_ENVIRONMENT ?? "";
	const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";

	if (environment !== "sandbox") {
		throw new Error(
			'Fixture capture only runs with MIDTRANS_ENVIRONMENT="sandbox".'
		);
	}
	if (serverKey.length === 0) {
		throw new Error(
			"MIDTRANS_SERVER_KEY is required; run with --env-file=.env.dev."
		);
	}
	if (!serverKey.startsWith("SB-Mid-server-")) {
		throw new Error(
			"MIDTRANS_SERVER_KEY does not look like a sandbox server key (SB-Mid-server-…)."
		);
	}

	const apiUrl = new URL(API_BASE_URL_SANDBOX);
	const snapUrl = new URL(SNAP_BASE_URL_SANDBOX);
	if (!apiUrl.hostname.endsWith(".sandbox.midtrans.com")) {
		throw new Error(`Unexpected Core API base URL: ${apiUrl.hostname}`);
	}
	if (!snapUrl.hostname.endsWith(".sandbox.midtrans.com")) {
		throw new Error(`Unexpected Snap API base URL: ${snapUrl.hostname}`);
	}

	return { serverKey };
}

async function parseResponseBody(response: Response): Promise<unknown> {
	const text = await response.text();
	if (text.length === 0) {
		return "";
	}
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}

function assertSanitized(serialized: string, serverKey: string): void {
	if (serialized.includes(serverKey)) {
		throw new Error("sanitization failed: the server key is present");
	}
	if (
		/OSSAccessKeyId|security-token|X-Amz-Signature|Signature=/.test(
			serialized
		)
	) {
		throw new Error("sanitization failed: a signed URL is present");
	}
}

function writeFixture(
	spec: CaptureSpec,
	status: number,
	body: unknown,
	serverKey: string
): void {
	const payload = {
		_meta: {
			name: spec.name,
			endpoint: spec.endpoint,
			http_status: status,
			captured_at: new Date().toISOString(),
			source: "midtrans-sandbox",
			sanitized: true,
		},
		body: sanitizeFixtureBody(body),
	};

	const serialized = `${JSON.stringify(payload, null, "\t")}\n`;
	assertSanitized(serialized, serverKey);

	const fullPath = join(FIXTURES_DIR, `${spec.name}.json`);
	mkdirSync(dirname(fullPath), { recursive: true });
	writeFileSync(fullPath, serialized);
}

function createCapture(serverKey: string) {
	const authorization = `Basic ${Buffer.from(`${serverKey}:`).toString(
		"base64"
	)}`;

	return async (spec: CaptureSpec): Promise<CaptureResult> => {
		const baseUrl =
			spec.base === "snap" ? SNAP_BASE_URL_SANDBOX : API_BASE_URL_SANDBOX;
		const expectedStatus = spec.expectedStatus ?? [200, 201];
		const path = spec.path ?? spec.endpoint.slice(spec.method.length + 1);

		if (path.includes("{")) {
			throw new Error(
				`${spec.name}: dynamic endpoints require an explicit path`
			);
		}

		const response = await fetch(`${baseUrl}${path}`, {
			method: spec.method,
			headers: {
				Accept: "application/json",
				Authorization: authorization,
				"Content-Type": "application/json",
				...spec.headers,
			},
			body:
				spec.body === undefined ? undefined : JSON.stringify(spec.body),
		});

		const body = await parseResponseBody(response);
		if (!expectedStatus.includes(response.status)) {
			throw new Error(
				`${spec.name}: expected HTTP ${expectedStatus.join("/")}, received ${
					response.status
				} — ${JSON.stringify(body)}`
			);
		}

		writeFixture(spec, response.status, body, serverKey);
		console.log(`${String(response.status).padEnd(3)} ${spec.name}`);
		return { status: response.status, body };
	};
}

function readString(body: unknown, key: string): string | undefined {
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return undefined;
	}
	const value = (body as Record<string, unknown>)[key];
	return typeof value === "string" ? value : undefined;
}

/** Formats a WIB (UTC+7) timestamp as expected by the Invoice API. */
function wibDate(daysFromNow: number): string {
	const timestamp = Date.now() + daysFromNow * 86_400_000 + 7 * 3_600_000;
	return `${new Date(timestamp).toISOString().slice(0, 19)}+07:00`;
}

async function main(): Promise<void> {
	const { serverKey } = resolveConfig();
	const capture = createCapture(serverKey);

	const stamp = `${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 6)}`;
	const orderId = (label: string) => `FIXTURE-${label}-${stamp}`;

	// --- Core: a bank-transfer lifecycle -------------------------------
	const bcaOrderId = orderId("CORE-BCA");
	await capture({
		name: "core/charge-bank-transfer-bca",
		endpoint: "POST /v2/charge",
		method: "POST",
		body: {
			payment_type: "bank_transfer",
			transaction_details: {
				order_id: bcaOrderId,
				gross_amount: 15000,
			},
			bank_transfer: { bank: "bca" },
		},
	});
	await capture({
		name: "core/status-pending",
		endpoint: "GET /v2/{order_id}/status",
		method: "GET",
		path: `/v2/${bcaOrderId}/status`,
	});
	await capture({
		name: "core/status-b2b",
		endpoint: "GET /v2/{order_id}/status/b2b",
		method: "GET",
		path: `/v2/${bcaOrderId}/status/b2b?page=0&per_page=10`,
	});
	await capture({
		name: "core/expire-success",
		endpoint: "POST /v2/{order_id}/expire",
		method: "POST",
		path: `/v2/${bcaOrderId}/expire`,
	});
	await capture({
		name: "core/status-after-expire",
		endpoint: "GET /v2/{order_id}/status",
		method: "GET",
		path: `/v2/${bcaOrderId}/status`,
	});
	await capture({
		name: "core/cancel-error",
		endpoint: "POST /v2/{order_id}/cancel",
		method: "POST",
		path: `/v2/${bcaOrderId}/cancel`,
	});
	await capture({
		name: "core/refund-error",
		endpoint: "POST /v2/{order_id}/refund",
		method: "POST",
		path: `/v2/${bcaOrderId}/refund`,
		body: { reason: "fixture refund", amount: 5000 },
	});
	await capture({
		name: "core/approve-empty-response",
		endpoint: "POST /v2/{order_id}/approve",
		method: "POST",
		path: `/v2/${bcaOrderId}/approve`,
		expectedStatus: [404],
	});

	// --- Core: one charge per payment channel --------------------------
	const channelCharges: ReadonlyArray<{
		name: string;
		body: Record<string, unknown>;
	}> = [
		{
			name: "core/charge-bank-transfer-permata",
			body: {
				payment_type: "bank_transfer",
				transaction_details: {
					order_id: orderId("CORE-PRM"),
					gross_amount: 15000,
				},
				bank_transfer: { bank: "permata" },
			},
		},
		{
			name: "core/charge-echannel",
			body: {
				payment_type: "echannel",
				transaction_details: {
					order_id: orderId("CORE-ECH"),
					gross_amount: 15000,
				},
				echannel: {
					bill_info1: "Payment For:",
					bill_info2: "Fixture",
				},
			},
		},
		{
			name: "core/charge-qris",
			body: {
				payment_type: "qris",
				transaction_details: {
					order_id: orderId("CORE-QRIS"),
					gross_amount: 15000,
				},
				qris: { acquirer: "gopay" },
			},
		},
		{
			name: "core/charge-shopeepay",
			body: {
				payment_type: "shopeepay",
				transaction_details: {
					order_id: orderId("CORE-SPAY"),
					gross_amount: 15000,
				},
				shopeepay: { callback_url: "https://example.test/callback" },
			},
		},
		{
			name: "core/charge-cstore-indomaret",
			body: {
				payment_type: "cstore",
				transaction_details: {
					order_id: orderId("CORE-STORE"),
					gross_amount: 15000,
				},
				cstore: { store: "indomaret", message: "Fixture" },
			},
		},
	];

	for (const charge of channelCharges) {
		await capture({
			name: charge.name,
			endpoint: "POST /v2/charge",
			method: "POST",
			body: charge.body,
		});
	}

	// --- Core: errors ---------------------------------------------------
	await capture({
		name: "core/status-not-found",
		endpoint: "GET /v2/{order_id}/status",
		method: "GET",
		path: `/v2/${orderId("CORE-MISSING")}/status`,
	});
	await capture({
		name: "core/error-validation",
		endpoint: "POST /v2/charge",
		method: "POST",
		body: { payment_type: "bank_transfer" },
		expectedStatus: [400],
	});
	await capture({
		name: "core/error-unauthorized",
		endpoint: "POST /v2/charge",
		method: "POST",
		body: {},
		headers: { Authorization: "Basic invalid" },
		expectedStatus: [401],
	});

	// --- Snap -----------------------------------------------------------
	await capture({
		name: "snap/create",
		endpoint: "POST /snap/v1/transactions",
		method: "POST",
		base: "snap",
		body: {
			transaction_details: {
				order_id: orderId("SNAP"),
				gross_amount: 15000,
			},
			item_details: [
				{
					id: "sku-1",
					price: 15000,
					quantity: 1,
					name: "Fixture item",
				},
			],
			customer_details: {
				first_name: "Probe",
				last_name: "User",
				email: "probe@example.org",
				phone: "8123456789",
			},
			enabled_payments: ["bca_va", "gopay"],
		},
	});
	await capture({
		name: "snap/preferences",
		endpoint: "GET /snap/v3/merchant-preferences",
		method: "GET",
		base: "snap",
		path: "/snap/v3/merchant-preferences",
	});
	await capture({
		name: "snap/error-validation",
		endpoint: "POST /snap/v1/transactions",
		method: "POST",
		base: "snap",
		body: { transaction_details: {} },
		expectedStatus: [400],
	});

	// --- Payment Link ---------------------------------------------------
	const paymentLink = await capture({
		name: "payment-link/create",
		endpoint: "POST /v1/payment-links",
		method: "POST",
		body: {
			transaction_details: {
				order_id: orderId("PL"),
				gross_amount: 15000,
				payment_link_id: `fixture-${stamp}`,
			},
			usage_limit: 1,
			enabled_payments: ["bca_va", "gopay"],
			item_details: [
				{
					id: "sku-1",
					price: 15000,
					quantity: 1,
					name: "Fixture item",
					url: "https://example.test/item/1",
				},
			],
		},
	});
	const paymentLinkOrderId = readString(paymentLink.body, "order_id");
	if (!paymentLinkOrderId) {
		throw new Error("payment-link/create did not return an order_id");
	}
	await capture({
		name: "payment-link/get",
		endpoint: "GET /v1/payment-links/{order_id}",
		method: "GET",
		path: `/v1/payment-links/${paymentLinkOrderId}`,
	});
	await capture({
		name: "payment-link/delete",
		endpoint: "DELETE /v1/payment-links/{order_id}",
		method: "DELETE",
		path: `/v1/payment-links/${paymentLinkOrderId}`,
	});
	await capture({
		name: "payment-link/error-not-found",
		endpoint: "GET /v1/payment-links/{order_id}",
		method: "GET",
		path: `/v1/payment-links/DOES-NOT-EXIST-${stamp}`,
		expectedStatus: [404],
	});

	// --- Invoice --------------------------------------------------------
	const invoice = await capture({
		name: "invoice/create",
		endpoint: "POST /v1/invoices",
		method: "POST",
		body: {
			order_id: orderId("INV"),
			invoice_number: `FIXTURE-INV-${stamp}`,
			invoice_date: wibDate(0),
			due_date: wibDate(30),
			customer_details: {
				name: "Probe User",
				email: "probe@example.org",
				phone: "8123456789",
			},
			item_details: [{ item_id: "sku-1", quantity: 1, price: 15000 }],
			payment_type: "payment_link",
			payment_link: { enabled_payments: ["bca_va"] },
			document_type: "invoice",
			tax_mode: "exclusive",
		},
	});
	const invoiceId = readString(invoice.body, "id");
	if (!invoiceId) {
		throw new Error("invoice/create did not return an id");
	}
	await capture({
		name: "invoice/get",
		endpoint: "GET /v1/invoices/{invoice_id}",
		method: "GET",
		path: `/v1/invoices/${invoiceId}`,
	});
	await capture({
		name: "invoice/void",
		endpoint: "PATCH /v1/invoices/{invoice_id}/void",
		method: "PATCH",
		path: `/v1/invoices/${invoiceId}/void`,
		body: {},
	});
	await capture({
		name: "invoice/error-not-found",
		endpoint: "GET /v1/invoices/{invoice_id}",
		method: "GET",
		path: `/v1/invoices/DOES-NOT-EXIST-${stamp}`,
		expectedStatus: [404],
	});

	// --- Subscription ---------------------------------------------------
	const subscription = await capture({
		name: "subscription/create",
		endpoint: "POST /v1/subscriptions",
		method: "POST",
		body: {
			name: "fixture",
			amount: "15000",
			currency: "IDR",
			payment_type: "credit_card",
			token: "fixture-token",
			schedule: { interval: 1, interval_unit: "month" },
		},
	});
	const subscriptionId = readString(subscription.body, "id");
	if (!subscriptionId) {
		throw new Error("subscription/create did not return an id");
	}
	await capture({
		name: "subscription/get",
		endpoint: "GET /v1/subscriptions/{subscription_id}",
		method: "GET",
		path: `/v1/subscriptions/${subscriptionId}`,
	});
	await capture({
		name: "subscription/error-not-found",
		endpoint: "GET /v1/subscriptions/{subscription_id}",
		method: "GET",
		path: `/v1/subscriptions/DOES-NOT-EXIST-${stamp}`,
		expectedStatus: [404],
	});

	console.log(`\nFixtures written to ${FIXTURES_DIR}`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
