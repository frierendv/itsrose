import { z } from "zod/v4";
import { PaymentChannels } from "../../common";

export const SnapBrand = z.object({
	typography: z.string(),
	header_color: z.string(),
	button_color: z.string(),
	input_border_radius: z.number().nonnegative(),
	button_border_radius: z.number().nonnegative(),
	hide_header: z.boolean(),
});
export const SnapPaymentChannel = z.object({
	name: PaymentChannels,
	enable: z.boolean(),
});
/**
 * Snap merchant appearance and payment preferences.
 */
export const SnapPreference = z
	.object({
		display_name: z.string().optional(),
		finish_payment_return_url: z.url().optional(),
		error_payment_return_url: z.url().optional(),
		locale: z.union([z.enum(["id", "en"]), z.string()]).optional(),
		other_va_processor: z.string(),
		allow_retry: z.boolean().optional(),
		hide_order_id: z.boolean().optional(),
		brand: SnapBrand.partial().optional(),
		payment_channels: z
			.union([
				z.array(SnapPaymentChannel),
				z.array(z.object({ name: z.string(), enable: z.boolean() })),
			])
			.optional(),
	})
	.meta({
		id: "MidtransSnapPreference",
	});

export type SnapPaymentChannel = z.infer<typeof SnapPaymentChannel>;
export type SnapPreference = z.infer<typeof SnapPreference>;
