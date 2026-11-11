import { z } from "zod/v4";
import { BankCodeSchema } from "../../primitives";

/**
 * Transaction route channel.
 */
export const CreditCardRouteChannelSchema = z.enum([
	"dragon",
	"mandiri",
	"migs",
	"tupay",
]);
export type CreditCardRouteChannel = z.infer<
	typeof CreditCardRouteChannelSchema
>;

/**
 * Credit Card parameters
 */
export const CreditCardFieldsSchema = z.object({
	token_id: z.string(),
	/**
	 * Name of the acquiring bank.
	 *
	 * By default it only support "bca", "bni", "bri", "cimb", "maybank", "mandiri".
	 */
	bank: BankCodeSchema.optional(),
	/**
	 * Installment tenure in terms of months.
	 */
	installment_term: z.int().optional(),
	/**
	 * List of credit card's BIN (Bank Identification Number) that is allowed for transaction.
	 */
	bins: z.array(z.string()).optional(),
	/**
	 * Pre-authorization type.
	 */
	type: z.literal("authorize").optional(),
	/**
	 * Save token id.
	 *
	 * Used on 'One Click' or 'Two Clicks'.
	 * Set to `true` will return a `saved_token_id` that can be used for the next transaction.
	 */
	save_token_id: z.boolean().optional(),
	/**
	 * Transaction route channel.
	 *
	 * @remarks
	 * Used to route transaction to specific channel.
	 * if merchant has multiple channels, this field will help to route the transaction to the specific channel.
	 */
	channel: CreditCardRouteChannelSchema.optional(),
	/**
	 * Enable 3D Secure authentication for this transaction.
	 *
	 * @remarks
	 * When the card requires authentication the charge stays `pending` and the
	 * response includes a `redirect_url` pointing at the 3DS challenge.
	 */
	secure: z.boolean().optional(),
	/**
	 * Force 3DS authentication even when the issuer would allow frictionless.
	 *
	 * @remarks
	 * Only meaningful together with `secure: true`.
	 */
	authentication: z.boolean().optional(),
});
export type CreditCardFields = z.infer<typeof CreditCardFieldsSchema>;
