/**
 * Deterministic sanitizer for captured Midtrans sandbox fixtures.
 *
 * Captured responses may contain values that must never be committed:
 *
 * - `signature_key` is a SHA-512 digest derived from the merchant server key
 *   (`SHA512(order_id + status_code + gross_amount + serverKey)`).
 * - Snap tokens, redirect URLs, virtual-account numbers, payment codes,
 *   bill keys and QR strings authorize real (sandbox) payments.
 * - Invoice and payment-link PDF URLs are signed object-storage URLs that
 *   embed temporary STS credentials in the query string.
 *
 * The sanitizer walks the payload and replaces those values with stable,
 * type-preserving placeholders so the fixture keeps the same JSON shape as
 * the real response.
 */

const REDACTED_URL = "https://example.test/redacted";
const REDACTED_PDF_URL = "https://example.test/redacted.pdf";

const URL_KEYS: ReadonlySet<string> = new Set([
	"redirect_url",
	"payment_url",
	"qr_url",
	"payment_link_url",
	"pdf_url",
	"paid_pdf_url",
	"shortened_pdf_url",
	"finish_payment_return_url",
	"error_payment_return_url",
	"unfinish_payment_return_url",
	"url",
]);

const STRING_PLACEHOLDERS: Readonly<Record<string, string>> = {
	order_id: "ORDER-REDACTED",
	transaction_id: "00000000-0000-4000-8000-000000000000",
	merchant_id: "G000000000",
	signature_key: "0".repeat(128),
	token: "token-redacted",
	snap_token: "token-redacted",
	token_id: "token-redacted",
	va_number: "8808123456789012",
	permata_va_number: "8808123456789012",
	custom_va_number: "8808123456789012",
	payment_code: "1234567890",
	approval_code: "000000",
	bill_key: "123456789012",
	qr_string: "QRIS-REDACTED",
	payment_link_id: "payment-link-redacted",
	paymentLinkId: "payment-link-redacted",
	PaymentLinkId: "payment-link-redacted",
	number: "8808123456789012",
	email: "probe@example.org",
	phone: "8123456789",
	first_name: "Probe",
	last_name: "User",
	full_name: "Probe User",
	display_name: "Redacted Merchant",
	reference: "REF-REDACTED",
	notes: "notes redacted",
	title: "Redacted",
	custom_field1: "custom-field-redacted",
	custom_field2: "custom-field-redacted",
	custom_field3: "custom-field-redacted",
	address: "Redacted Address",
	city: "Jakarta",
	postal_code: "12345",
	bca_va_inquiry_text_raw: "free-text-redacted",
	bca_va_payment_text_raw: "free-text-redacted",
	whitelist_bins_raw: "[]",
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeField(
	key: string,
	value: unknown,
	parentKey?: string
): unknown {
	if (value === null || value === undefined) {
		return value;
	}

	// `name` is only sensitive when it belongs to a customer. Item names,
	// payment-channel names and field labels must keep their meaning.
	if (key === "name") {
		if (parentKey === "customer_details") {
			return "Probe User";
		}
		return sanitizeValue(value, key);
	}

	const placeholder = STRING_PLACEHOLDERS[key];
	if (placeholder !== undefined && typeof value !== "object") {
		if (typeof value === "number") {
			return 0;
		}
		return placeholder;
	}

	if (key === "metadata") {
		return typeof value === "string" ? "{}" : {};
	}

	if (URL_KEYS.has(key) && typeof value === "string") {
		return key.includes("pdf") ? REDACTED_PDF_URL : REDACTED_URL;
	}

	if (key === "id") {
		return typeof value === "number" ? 1 : "000000000000000000000000";
	}

	if (
		key === "bulk_upload_id" ||
		key === "priority_card_feature" ||
		key === "dynamic_amount" ||
		key === "payment_settings"
	) {
		return null;
	}

	return sanitizeValue(value, key);
}

function sanitizeValue(value: unknown, parentKey?: string): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => sanitizeValue(item, parentKey));
	}

	if (isRecord(value)) {
		const result: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			result[key] = sanitizeField(key, child, parentKey);
		}
		return result;
	}

	return value;
}

/**
 * Returns a sanitized deep copy of a captured response body.
 *
 * The transformation is deterministic: capturing the same shape twice
 * produces the same placeholders, so fixture diffs stay reviewable.
 */
export function sanitizeFixtureBody(body: unknown): unknown {
	return sanitizeValue(body);
}
