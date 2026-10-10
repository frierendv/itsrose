import { z } from "zod/v4";
import {
	Callbacks,
	CustomerDetails,
	ItemDetails,
	Metadata,
	SnapExpiry,
	TransactionDetails,
} from "../../common";
import { BCAExclusiveFreeTextSchema } from "../../core";

/**
 * Snap-specific options for BCA Virtual Account.
 */
export const SnapBcaVa = z
	.object({
		va_number: z.string().max(30).optional(),
		sub_company_code: z.string().max(10).optional(),
		free_text: BCAExclusiveFreeTextSchema.optional(),
	})
	.meta({
		id: "MidtransSnapBcaVa",
	});

/**
 * Snap-specific options for standard Virtual Accounts (BNI, BRI, CIMB).
 */
export const SnapStandardVa = z
	.object({
		va_number: z.string().max(30).optional(),
	})
	.meta({
		id: "MidtransSnapStandardVa",
	});

/**
 * Snap-specific options for Permata Virtual Account.
 */
export const SnapPermataVa = z
	.object({
		va_number: z.string().max(30).optional(),
		recipient_name: z.string().max(50).optional(),
	})
	.meta({
		id: "MidtransSnapPermataVa",
	});

/**
 * Snap-specific options for GoPay.
 */
export const SnapGopay = z
	.object({
		enable_callback: z.boolean().optional(),
		callback_url: z.string().url().optional(),
	})
	.meta({
		id: "MidtransSnapGopay",
	});

/**
 * Snap-specific options for ShopeePay.
 */
export const SnapShopeepay = z
	.object({
		callback_url: z.string().url().optional(),
	})
	.meta({
		id: "MidtransSnapShopeepay",
	});

/**
 * Snap Create Transaction Request payload.
 *
 * `POST /snap/v1/transactions`
 */
export const SnapTransactionRequest = z
	.object({
		transaction_details: TransactionDetails,
		item_details: z.union([z.array(ItemDetails), ItemDetails]).optional(),
		customer_details: CustomerDetails.optional(),
		enabled_payments: z
			.array(z.string())
			.optional()
			.describe(
				"Whitelist of allowed payment channels for this transaction"
			),
		bca_va: SnapBcaVa.optional(),
		bni_va: SnapStandardVa.optional(),
		bri_va: SnapStandardVa.optional(),
		cimb_va: SnapStandardVa.optional(),
		permata_va: SnapPermataVa.optional(),
		gopay: SnapGopay.optional(),
		shopeepay: SnapShopeepay.optional(),
		callbacks: Callbacks.optional(),
		expiry: SnapExpiry.optional(),
		page_expiry: SnapExpiry.optional(),
		custom_field1: z.string().max(255).optional(),
		custom_field2: z.string().max(255).optional(),
		custom_field3: z.string().max(255).optional(),
		metadata: Metadata.optional(),
	})
	.meta({
		id: "MidtransSnapTransactionRequest",
	});

export const SnapCreateTransactionRequest = SnapTransactionRequest;

export type SnapBcaVa = z.infer<typeof SnapBcaVa>;
export type SnapStandardVa = z.infer<typeof SnapStandardVa>;
export type SnapPermataVa = z.infer<typeof SnapPermataVa>;
export type SnapGopay = z.infer<typeof SnapGopay>;
export type SnapShopeepay = z.infer<typeof SnapShopeepay>;

export type SnapTransactionRequest = z.infer<typeof SnapTransactionRequest>;
export type SnapCreateTransactionRequest = SnapTransactionRequest;
