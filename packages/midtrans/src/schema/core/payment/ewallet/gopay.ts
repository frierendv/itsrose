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
		enable_callback: z.boolean(),
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
		callback_url: z.string(),
		/**
		 * ### Required for GoPay Tokenization.
		 *
		 * The customer account ID linked during {@link https://docs.midtrans.com/reference/create-pay-account | Create Pay Account API}.
		 */
		account_id: z.string(),
		/**
		 * ### Required for GoPay Tokenization.
		 *
		 * Token to specify the payment option made by the customer from {@link https://docs.midtrans.com/reference/get-pay-account | Get Pay Account API metadata}.
		 */
		payment_option_token: z.string(),
		/**
		 * Reserve customer balance amount.
		 *
		 * @remarks
		 * Set the value to `true` to reserve the specified amount from the customer balance.
		 * Once the customer balance is reserved, you can initiate a subsequent Capture API request.
		 *
		 * @default false
		 */
		pre_auth: z.boolean(),
		/**
		 * Mark as a recurring transaction.
		 *
		 * @remarks
		 * Set the value to `true` no PIN challenge will be triggered to the user,
		 * only allowed for authorized merchants.
		 *
		 * @default false
		 */
		recurring: z.boolean(),
		/**
		 * GoPay promotion ID to be used for payment.
		 *
		 * @remarks
		 * Only applicable for GoPay Tokenization. Acquired from Fetch Promotion API.
		 * Currently only support single promotion per transaction, the first promotion id on the list will be applied.
		 */
		promotion_ids: z.array(z.string()),
	})
	.partial()
	.meta({
		id: "MidtransGopayFields",
	});

export type GopayFields = z.infer<typeof GopayFieldsSchema>;
