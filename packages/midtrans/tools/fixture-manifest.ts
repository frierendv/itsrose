import { z } from "zod/v4";
import {
	ApiErrorSchema,
	CoreErrorSchema,
	DefaultErrorSchema,
	InvoiceResponseSchema,
	PaymentLinkDeleteResponse,
	PaymentLinkDetailResponse,
	PaymentLinkResponse,
	ResponseTransactionSchema,
	SnapPreferenceResponseSchema,
	SnapTransactionResponseSchema,
} from "../src/schema/index";

/**
 * How a fixture is expected to behave against the package schemas.
 *
 * - `mustPass`: the schema must validate the fixture; a failure breaks CI.
 * - `knownMismatch`: the current schema is known not to match the real
 *   response. The fixture is still tracked so the gap cannot silently grow.
 * - `unmodeled`: no package schema exists yet (for example subscriptions).
 */
export type FixtureExpectation = "mustPass" | "knownMismatch" | "unmodeled";

export interface FixtureDefinition {
	/** Schema the fixture is expected to validate against. */
	readonly schema: z.ZodType | null;
	/** Current expectation for this fixture. */
	readonly expectation: FixtureExpectation;
	/** Why the fixture is a known mismatch / unmodeled. */
	readonly note?: string;
}

const InvoiceVoidResponseSchema = z.object({ success: z.boolean() });

/**
 * Registry of every committed sandbox fixture.
 *
 * The key is the fixture path relative to `packages/midtrans/fixtures`,
 * without the `.json` extension.
 */
export const FIXTURES: Readonly<Record<string, FixtureDefinition>> = {
	// --- Core API: charges -------------------------------------------------
	"core/charge-bank-transfer-bca": {
		schema: ResponseTransactionSchema,
		expectation: "knownMismatch",
		note: "schema requires signature_key; charge responses do not include it",
	},
	"core/charge-bank-transfer-permata": {
		schema: ResponseTransactionSchema,
		expectation: "knownMismatch",
		note: "schema requires va_numbers; Permata returns permata_va_number",
	},
	"core/charge-echannel": {
		schema: ResponseTransactionSchema,
		expectation: "knownMismatch",
		note: "echannel payment_type branch is not modeled",
	},
	"core/charge-qris": {
		schema: ResponseTransactionSchema,
		expectation: "knownMismatch",
		note: "qris payment_type branch is not modeled",
	},
	"core/charge-shopeepay": {
		schema: ResponseTransactionSchema,
		expectation: "knownMismatch",
		note: "shopeepay payment_type branch is not modeled",
	},
	"core/charge-cstore-indomaret": {
		schema: ResponseTransactionSchema,
		expectation: "knownMismatch",
		note: "cstore payment_type branch is not modeled",
	},

	// --- Core API: lifecycle ----------------------------------------------
	"core/status-pending": {
		schema: ResponseTransactionSchema,
		expectation: "mustPass",
	},
	"core/status-b2b": {
		schema: null,
		expectation: "unmodeled",
		note: "statusB2B returns an untyped wrapper; schema planned for Phase 3",
	},
	"core/expire-success": {
		schema: ResponseTransactionSchema,
		expectation: "knownMismatch",
		note: "signature_key and va_numbers are absent on the expire response",
	},
	"core/status-after-expire": {
		schema: ResponseTransactionSchema,
		expectation: "mustPass",
	},
	"core/cancel-error": {
		schema: CoreErrorSchema,
		expectation: "mustPass",
	},
	"core/refund-error": {
		schema: CoreErrorSchema,
		expectation: "mustPass",
	},
	"core/approve-empty-response": {
		schema: ApiErrorSchema,
		expectation: "knownMismatch",
		note: "approve/deny answer HTTP 404 with an empty body, which no schema models",
	},

	// --- Core API: errors --------------------------------------------------
	"core/status-not-found": {
		schema: CoreErrorSchema,
		expectation: "mustPass",
	},
	"core/error-validation": {
		schema: ApiErrorSchema,
		expectation: "mustPass",
	},
	"core/error-unauthorized": {
		schema: ApiErrorSchema,
		expectation: "knownMismatch",
		note: "HTTP 401 returns { error: 'Unauthorized' }, which is not part of ApiErrorSchema",
	},

	// --- Snap --------------------------------------------------------------
	"snap/create": {
		schema: SnapTransactionResponseSchema,
		expectation: "mustPass",
	},
	"snap/preferences": {
		schema: SnapPreferenceResponseSchema,
		expectation: "knownMismatch",
		note: "allow_retry can be null; channels use `enabled`; fee configs are an array",
	},
	"snap/error-validation": {
		schema: DefaultErrorSchema,
		expectation: "mustPass",
	},

	// --- Payment Link ------------------------------------------------------
	"payment-link/create": {
		schema: PaymentLinkResponse,
		expectation: "knownMismatch",
		note: "real response is { order_id, payment_url, qr_url }",
	},
	"payment-link/get": {
		schema: PaymentLinkDetailResponse,
		expectation: "knownMismatch",
		note: "customer_details and metadata are nullish, item_details[].item_id can be null, expiry.unit can be `months`",
	},
	"payment-link/delete": {
		schema: PaymentLinkDeleteResponse,
		expectation: "mustPass",
	},
	"payment-link/error-not-found": {
		schema: DefaultErrorSchema,
		expectation: "mustPass",
	},

	// --- Invoice -----------------------------------------------------------
	"invoice/create": {
		schema: InvoiceResponseSchema,
		expectation: "mustPass",
	},
	"invoice/get": {
		schema: InvoiceResponseSchema,
		expectation: "mustPass",
	},
	"invoice/void": {
		schema: InvoiceVoidResponseSchema,
		expectation: "mustPass",
		note: "inline until an InvoiceVoidResponseSchema is added in Phase 3",
	},
	"invoice/error-not-found": {
		schema: DefaultErrorSchema,
		expectation: "mustPass",
	},

	// --- Subscription ------------------------------------------------------
	"subscription/create": {
		schema: null,
		expectation: "unmodeled",
		note: "subscription endpoints have no schemas yet",
	},
	"subscription/get": {
		schema: null,
		expectation: "unmodeled",
		note: "subscription endpoints have no schemas yet",
	},
	"subscription/error-not-found": {
		schema: ApiErrorSchema,
		expectation: "knownMismatch",
		note: "response is { status_message } without status_code or error_messages",
	},
};
