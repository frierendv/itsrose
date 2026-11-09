/**
 * API helper for the Midtrans sandbox payment simulator.
 *
 * The simulator is a set of HTML forms (not a JSON API), so this module
 * performs the same form submissions a browser would:
 *
 * - BCA VA: `/bca/va/inquiry` → `/bca/va/payment`
 * - BNI VA: `/bni/va/inquiry` → `/bni/va/payment`
 * - OpenAPI VA (BRI, Permata, CIMB, …): `/openapi/va/inquiry?bank=…` →
 *   `/openapi/va/payment?bank=…`
 * - Alfamart: `/alfamart/inquiry` → `/alfamart/payment`
 *
 * All requests are plain `application/x-www-form-urlencoded`; no cookies are
 * required for the supported flows. The helper returns the final simulator
 * page so callers can assert on `ok` and poll the actual transaction status
 * with the Core API.
 *
 * @see https://docs.midtrans.com/docs/testing-payment-on-sandbox
 */

export const SIMULATOR_BASE_URL = "https://simulator.sandbox.midtrans.com";

export type SimulatorVaBank =
	| "bca"
	| "bni"
	| "bri"
	| "permata"
	| "cimb"
	| "danamon"
	| "bsi"
	| "seabank"
	| "saqu";

export interface SimulatorResult {
	/** Whether the final simulator page reported a successful payment. */
	readonly ok: boolean;
	/** HTTP status of the final request. */
	readonly status: number;
	/** Final URL after redirects. */
	readonly url: string;
	/** Final HTML body (useful for debugging). */
	readonly body: string;
}

interface HtmlForm {
	readonly action: string;
	readonly method: string;
	readonly fields: Record<string, string>;
}

interface SubmitResult {
	readonly status: number;
	readonly url: string;
	readonly body: string;
}

function readAttribute(tag: string, name: string): string | undefined {
	const match = new RegExp(`\\b${name}="([^"]*)"`, "i").exec(tag);
	return match?.[1];
}

/**
 * Extracts the first `<form>` and its input values from simulator HTML.
 */
function parseFirstForm(html: string): HtmlForm | undefined {
	const formMatch = /<form\b([^>]*)>([\s\S]*?)<\/form>/i.exec(html);
	if (!formMatch) {
		return undefined;
	}

	const attributes = formMatch[1] ?? "";
	const body = formMatch[2] ?? "";
	const fields: Record<string, string> = {};

	for (const inputMatch of body.matchAll(/<input\b([^>]*?)\/?>/gi)) {
		const input = inputMatch[1] ?? "";
		const name = readAttribute(input, "name");
		if (!name) {
			continue;
		}
		fields[name] = readAttribute(input, "value") ?? "";
	}

	return {
		action: readAttribute(attributes, "action") ?? "",
		method: (readAttribute(attributes, "method") ?? "post").toLowerCase(),
		fields,
	};
}

function requireForm(html: string, label: string): HtmlForm {
	const form = parseFirstForm(html);
	if (!form) {
		throw new Error(`Sandbox simulator: no form found for ${label}`);
	}
	return form;
}

async function submit(
	url: string,
	fields: Record<string, string>
): Promise<SubmitResult> {
	const body = new URLSearchParams();
	for (const [key, value] of Object.entries(fields)) {
		body.set(key, value);
	}

	const response = await fetch(url, {
		method: "POST",
		headers: {
			Accept: "text/html",
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body,
		redirect: "follow",
	});

	return {
		status: response.status,
		url: response.url,
		body: await response.text(),
	};
}

function toResult(result: SubmitResult): SimulatorResult {
	return {
		ok: /successful/i.test(result.body),
		status: result.status,
		url: result.url,
		body: result.body,
	};
}

function decimalAmount(amount: string | number): string {
	if (typeof amount === "number") {
		return amount.toFixed(2);
	}
	return amount.includes(".") ? amount : `${amount}.00`;
}

function integerAmount(amount: string | number): string {
	const numeric = typeof amount === "number" ? amount : Number(amount);
	if (!Number.isFinite(numeric)) {
		throw new TypeError(`Invalid amount: ${String(amount)}`);
	}
	return Math.trunc(numeric).toString();
}

const OPENAPI_VA_BANKS: ReadonlySet<SimulatorVaBank> = new Set([
	"bri",
	"permata",
	"cimb",
	"danamon",
	"bsi",
	"seabank",
	"saqu",
]);

/**
 * Pays a virtual account through the sandbox simulator.
 */
export async function payVirtualAccount(input: {
	bank: SimulatorVaBank;
	vaNumber: string;
	amount: string | number;
}): Promise<SimulatorResult> {
	const { bank, vaNumber, amount } = input;

	if (bank === "bca") {
		const inquiry = await submit(`${SIMULATOR_BASE_URL}/bca/va/inquiry`, {
			va_number: vaNumber,
		});
		const form = requireForm(inquiry.body, "BCA VA inquiry");

		return toResult(
			await submit(`${SIMULATOR_BASE_URL}/bca/va/payment`, {
				...form.fields,
				total_amount: decimalAmount(amount),
			})
		);
	}

	if (bank === "bni") {
		const inquiry = await submit(`${SIMULATOR_BASE_URL}/bni/va/inquiry`, {
			va_number: vaNumber,
		});
		const form = requireForm(inquiry.body, "BNI VA inquiry");

		return toResult(
			await submit(`${SIMULATOR_BASE_URL}/bni/va/payment`, {
				...form.fields,
				va_number: form.fields.va_number || vaNumber,
				// BNI rejects decimal amounts in the simulator.
				total_amount: integerAmount(amount),
			})
		);
	}

	if (!OPENAPI_VA_BANKS.has(bank)) {
		throw new Error(
			`Sandbox simulator: unsupported virtual-account bank "${bank}"`
		);
	}

	const inquiry = await submit(
		`${SIMULATOR_BASE_URL}/openapi/va/inquiry?bank=${bank}`,
		{ bank: bank.toUpperCase(), vaNumber }
	);
	const form = requireForm(inquiry.body, `OpenAPI VA (${bank}) inquiry`);

	return toResult(
		await submit(`${SIMULATOR_BASE_URL}/openapi/va/payment?bank=${bank}`, {
			...form.fields,
			virtualAccountName: form.fields.virtualAccountName || "Midtrans",
			vaNumber: form.fields.vaNumber || vaNumber,
			amount: decimalAmount(amount),
		})
	);
}

/**
 * Pays an Alfamart / Indomaret payment code through the sandbox simulator.
 *
 * Indomaret requires the merchant product code; pass it explicitly when the
 * account is configured for it.
 */
export async function payCstore(input: {
	store: "alfamart" | "indomaret";
	paymentCode: string;
	productCode?: string;
}): Promise<SimulatorResult> {
	const { store, paymentCode, productCode } = input;

	if (store === "alfamart") {
		const inquiry = await submit(`${SIMULATOR_BASE_URL}/alfamart/inquiry`, {
			payment_code: paymentCode,
		});
		const form = requireForm(inquiry.body, "Alfamart inquiry");

		return toResult(
			await submit(`${SIMULATOR_BASE_URL}/alfamart/payment`, {
				...form.fields,
				payment_code: form.fields.payment_code || paymentCode,
			})
		);
	}

	if (!productCode) {
		throw new Error(
			"Sandbox simulator: Indomaret requires the merchant product code"
		);
	}

	const inquiry = await submit(
		`${SIMULATOR_BASE_URL}/indomaret/phoenix/inquiry`,
		{ payment_code: paymentCode, product_code: productCode }
	);
	const form = requireForm(inquiry.body, "Indomaret inquiry");

	return toResult(
		await submit(`${SIMULATOR_BASE_URL}/indomaret/phoenix/payment`, {
			...form.fields,
			payment_code: form.fields.payment_code || paymentCode,
			product_code: form.fields.product_code || productCode,
		})
	);
}
