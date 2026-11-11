import { z } from "zod/v4";
import { ExpirySchema, PaymentChannels } from "../primitives";
import { SubscriptionScheduleSchema } from "../subscription";

/* ------------------------------- Page Expiry ------------------------------ */

export const SnapPageExpirySchema = ExpirySchema.omit({
	start_time: true,
});
export type SnapPageExpiry = z.infer<typeof SnapPageExpirySchema>;

/* ------------------------------- Recurring -------------------------------- */

export const SnapRecurringSchema = SubscriptionScheduleSchema.pick({
	interval_unit: true,
	start_time: true,
})
	.partial()
	.extend({
		required: z.boolean(),
	});
export type SnapRecurring = z.infer<typeof SnapRecurringSchema>;

/* ------------------------------- Send Email ------------------------------- */

export const SnapSendEmailSchema = z.object({
	token: z.object({
		/** Enable sending an email when the Snap token is created. */
		enabled: z.boolean(),
	}),
	reminder: z.object({
		/**
		 * Enable reminder emails.
		 *
		 * @remarks
		 * When set to true, an email is sent after the Snap token is created, based on `reminder.delay`.
		 * An additional email is sent when the Snap token expires.
		 */
		enabled: z.boolean(),
		/**
		 * Reminder delay in minutes, measured from the time the Snap token is created.
		 * Notes: Must be between 10 and 60 minutes, inclusive.
		 */
		delay: z.int().positive().min(10).max(60),
	}),
});
export type SnapSendEmail = z.infer<typeof SnapSendEmailSchema>;

/* ------------------------------- Preference ------------------------------- */

/**
 * Snap merchant fee configuration for a single payment channel.
 */
export const SnapPreferenceFeeConfig = z.object({
	enable: z.boolean(),
	payment_type: z.string(),
	customer_percentage: z.number(),
	acquirer: z.string().optional(),
});

/**
 * Snap checkout appearance settings.
 */
export const SnapPreferenceBrand = z.object({
	typography: z.string(),
	header_color: z.string(),
	button_color: z.string(),
	input_border_radius: z.number().nonnegative(),
	button_border_radius: z.number().nonnegative(),
	hide_header: z.boolean(),
});

/**
 * A payment channel and whether it is enabled in Snap.
 */
export const SnapPreferencePaymentChannelSchema = z.object({
	name: PaymentChannels,
	enabled: z.boolean(),
});

/**
 * Customer-imposed payment fee configuration.
 */
export const SnapPreferenceCustomerFeeSchema = z.object({
	enable: z.boolean(),
	payment_fee_configs: z.array(SnapPreferenceFeeConfig),
});

/**
 * Snap merchant preference update payload.
 */
export const SnapPreferenceSchema = z
	.object({
		display_name: z.string().optional(),
		finish_payment_return_url: z.url().optional(),
		error_payment_return_url: z.url().optional(),
		locale: z.union([z.enum(["id", "en"]), z.string()]).optional(),
		other_va_processor: z.string().optional(),
		allow_retry: z.boolean().nullish(),
		hide_order_id: z.boolean().optional(),
		brand: SnapPreferenceBrand.partial().optional(),
		payment_channels: z
			.array(SnapPreferencePaymentChannelSchema)
			.optional(),
		customer_imposed_payment_fee:
			SnapPreferenceCustomerFeeSchema.optional(),
	})
	.meta({
		id: "MidtransSnapPreference",
	});

export type SnapPreferencePaymentChannel = z.infer<
	typeof SnapPreferencePaymentChannelSchema
>;
export type SnapPreference = z.infer<typeof SnapPreferenceSchema>;
