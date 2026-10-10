import { z } from "zod/v4";
import { PaymentChannelSchema } from "../../shared";

export const SnapPreferenceFeeConfig = z.object({
	enable: z.boolean(),
	payment_type: z.string(),
	customer_percentage: z.number(),
	acquirer: z.string().optional(),
});
export const SnapPreferenceBrand = z.object({
	typography: z.string(),
	header_color: z.string(),
	button_color: z.string(),
	input_border_radius: z.number().nonnegative(),
	button_border_radius: z.number().nonnegative(),
	hide_header: z.boolean(),
});
export const SnapPreferencePaymentChannelSchema = z.object({
	name: PaymentChannelSchema,
	enable: z.boolean(),
});
/**
 * Snap merchant appearance and payment preferences.
 */
export const SnapPreferenceSchema = z
	.object({
		display_name: z.string().optional(),
		finish_payment_return_url: z.url().optional(),
		error_payment_return_url: z.url().optional(),
		locale: z.union([z.enum(["id", "en"]), z.string()]).optional(),
		other_va_processor: z.string(),
		allow_retry: z.boolean().optional(),
		hide_order_id: z.boolean().optional(),
		brand: SnapPreferenceBrand.partial().optional(),
		payment_channels: z
			.union([
				z.array(SnapPreferencePaymentChannelSchema),
				z.array(z.object({ name: z.string(), enable: z.boolean() })),
			])
			.optional(),
	})
	.meta({
		id: "MidtransSnapPreference",
	});

export type SnapPreferencePaymentChannel = z.infer<
	typeof SnapPreferencePaymentChannelSchema
>;
export type SnapPreference = z.infer<typeof SnapPreferenceSchema>;
