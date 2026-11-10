import { z } from "zod/v4";
import {
	ApiErrorSchema,
	CoreChargeResponseSchema,
	CoreErrorSchema,
	CoreStatusB2BResponseSchema,
	CoreTransactionResponseSchema,
	DefaultErrorSchema,
	InvoiceResponseSchema,
	InvoiceVoidResponseSchema,
	PaymentLinkDeleteResponse,
	PaymentLinkDetailResponseSchema,
	PaymentLinkResponse,
	SnapPreferenceResponseSchema,
	SnapTransactionResponseSchema,
	SubscriptionActionResponseSchema,
	SubscriptionResponseSchema,
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

/**
 * Registry of every committed sandbox fixture.
 *
 * The key is the fixture path relative to `packages/midtrans/fixtures`,
 * without the `.json` extension.
 */
export const FIXTURES: Readonly<Record<string, FixtureDefinition>> = {
	// --- Core API: charges -------------------------------------------------
	"core/charge-bank-transfer-bca": {
		schema: CoreChargeResponseSchema,
		expectation: "mustPass",
	},
	"core/charge-bank-transfer-permata": {
		schema: CoreChargeResponseSchema,
		expectation: "mustPass",
	},
	"core/charge-echannel": {
		schema: CoreChargeResponseSchema,
		expectation: "mustPass",
	},
	"core/charge-qris": {
		schema: CoreChargeResponseSchema,
		expectation: "mustPass",
	},
	"core/charge-shopeepay": {
		schema: CoreChargeResponseSchema,
		expectation: "mustPass",
	},
	"core/charge-cstore-indomaret": {
		schema: CoreChargeResponseSchema,
		expectation: "mustPass",
	},

	"core/charge-credit-card": {
		schema: CoreChargeResponseSchema,
		expectation: "mustPass",
	},
	"core/charge-credit-card-denied": {
		schema: CoreChargeResponseSchema,
		expectation: "mustPass",
	},
	"core/charge-credit-card-3ds": {
		schema: CoreChargeResponseSchema,
		expectation: "mustPass",
	},

	// --- Core API: lifecycle ----------------------------------------------
	"core/status-pending": {
		schema: CoreTransactionResponseSchema,
		expectation: "mustPass",
	},
	"core/status-b2b": {
		schema: CoreStatusB2BResponseSchema,
		expectation: "mustPass",
	},
	"core/expire-success": {
		schema: CoreTransactionResponseSchema,
		expectation: "mustPass",
	},
	"core/status-after-expire": {
		schema: CoreTransactionResponseSchema,
		expectation: "mustPass",
	},
	"core/status-settled": {
		schema: CoreTransactionResponseSchema,
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
		expectation: "mustPass",
	},

	// --- Snap --------------------------------------------------------------
	"snap/create": {
		schema: SnapTransactionResponseSchema,
		expectation: "mustPass",
	},
	"snap/preferences": {
		schema: SnapPreferenceResponseSchema,
		expectation: "mustPass",
	},
	"snap/update-preferences": {
		schema: SnapPreferenceResponseSchema,
		expectation: "mustPass",
	},
	"snap/error-validation": {
		schema: DefaultErrorSchema,
		expectation: "mustPass",
	},

	// --- Payment Link ------------------------------------------------------
	"payment-link/create": {
		schema: PaymentLinkResponse,
		expectation: "mustPass",
	},
	"payment-link/get": {
		schema: PaymentLinkDetailResponseSchema,
		expectation: "mustPass",
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
	},
	"invoice/error-not-found": {
		schema: DefaultErrorSchema,
		expectation: "mustPass",
	},

	// --- Subscription ------------------------------------------------------
	"subscription/create": {
		schema: SubscriptionResponseSchema,
		expectation: "mustPass",
	},
	"subscription/get": {
		schema: SubscriptionResponseSchema,
		expectation: "mustPass",
	},
	"subscription/disable": {
		schema: SubscriptionActionResponseSchema,
		expectation: "mustPass",
	},
	"subscription/enable": {
		schema: SubscriptionActionResponseSchema,
		expectation: "mustPass",
	},
	"subscription/update": {
		schema: SubscriptionActionResponseSchema,
		expectation: "mustPass",
	},
	"subscription/cancel": {
		schema: SubscriptionActionResponseSchema,
		expectation: "mustPass",
	},
	"subscription/error-not-found": {
		schema: ApiErrorSchema,
		expectation: "mustPass",
	},
};
