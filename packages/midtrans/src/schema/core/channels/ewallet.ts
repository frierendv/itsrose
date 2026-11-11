import { z } from "zod/v4";

/**
 * GoPay charge parameters.
 */
export const GopayFieldsSchema = z
	.object({
		/**
		 * Whether to enable redirect callback upon payment completion.
		 *
		 * @remarks
		 * ### Required for GoPay deeplink/QRIS.
		 * To determine appending callback URL in the deeplink.
		 *
		 * @default false
		 */
		enable_callback: z.boolean().optional(),
		/**
		 * The HTTP or Deeplink URL to which the customer is redirected from Gojek app after successful payment.
		 *
		 * @remarks
		 * ### For GoPay Tokenization
		 * Please make sure `callback_url` is the same URL submitted on onboarding process.
		 * If callback_url is not specified by merchant, we will use merchant's finish redirect URL that is set on
		 * Midtrans Administration Portal, please make sure these URLs are also submitted during onboarding process.
		 *
		 * @default "callback_url in dashboard settings."
		 */
		callback_url: z.string().optional(),
		/**
		 * ### Required for GoPay Tokenization.
		 *
		 * The customer account ID linked during {@link https://docs.midtrans.com/reference/create-pay-account | Create Pay Account API}.
		 */
		account_id: z.string().optional(),
		/**
		 * ### Required for GoPay Tokenization.
		 *
		 * Token to specify the payment option made by the customer from {@link https://docs.midtrans.com/reference/get-pay-account | Get Pay Account API metadata}.
		 */
		payment_option_token: z.string().optional(),
		/**
		 * Reserve customer balance amount.
		 *
		 * @remarks
		 * Set the value to `true` to reserve the specified amount from the customer balance.
		 * Once the customer balance is reserved, you can initiate a subsequent Capture API request.
		 *
		 * @default false
		 */
		pre_auth: z.boolean().optional(),
		/**
		 * Mark as a recurring transaction.
		 *
		 * @remarks
		 * Set the value to `true` no PIN challenge will be triggered to the user,
		 * only allowed for authorized merchants.
		 *
		 * @default false
		 */
		recurring: z.boolean().optional(),
		/**
		 * GoPay promotion ID to be used for payment.
		 *
		 * @remarks
		 * Only applicable for GoPay Tokenization. Acquired from Fetch Promotion API.
		 * Currently only support single promotion per transaction, the first promotion id on the list will be applied.
		 */
		promotion_ids: z.array(z.string()).optional(),
	})
	.partial()
	.meta({
		id: "MidtransGopayFields",
	});
export type GopayFields = z.infer<typeof GopayFieldsSchema>;

export const GopayPaymentProviderMetadataSchema = z.object({
	/** Merchant's recurring parent order ID */
	recurring_parent_order: z.string().optional(),
	/**
	 * Recurring sequence.
	 * - **0** : parent transaction
	 * - **1**  and so on: child transaction
	 */
	recurring_sequence: z.string().optional(),
});
/**
 * OVO charge parameters.
 */
export const OvoFieldsSchema = z.object({
	/**
	 * Customer's phone number that will be used to create payment request to OVO.
	 */
	payer_phone_number: z.string().optional(),
});
export type OvoFields = z.infer<typeof OvoFieldsSchema>;

export const QrisAcquirerSchema = z.enum(["gopay", "airpay shopee"]);
export type QrisAcquirer = z.infer<typeof QrisAcquirerSchema>;

/**
 * QRIS charge parameters.
 */
export const QrisFieldsSchema = z.object({
	/**
	 * Acquiring partner for QRIS generation.
	 */
	acquirer: QrisAcquirerSchema.optional(),
});
export type QrisFields = z.infer<typeof QrisFieldsSchema>;

/**
 * ShopeePay payment parameters.
 */
export const ShopeepayFieldsSchema = z
	.object({
		/**
		 * The URL to redirect the customer back from the ShopeePay app.
		 *
		 * Default value is the finish URL, configured on your MAP account.
		 */
		callback_url: z.url().optional(),
	})
	.meta({
		id: "MidtransShopeepayFields",
	});
export type ShopeepayFields = z.infer<typeof ShopeepayFieldsSchema>;
