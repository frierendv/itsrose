import type { BetterAuthPluginDBSchema } from "better-auth";
import { z } from "zod/v4";
import { SUBSCRIPTION_TABLE_NAME } from "../domain/constants";

const subscriptionStatusSchema = z.enum([
	"active",
	"pending_payment",
	"past_due",
	"expired",
	"canceled",
]);

export const createSubscriptionSchema = z.object({
	user_id: z.string().optional(),
	plan_id: z.string(),
	interval: z.enum(["month", "year"]).optional().default("month"),
	period_start: z.iso.datetime().optional(),
	period_end: z.iso.datetime().optional(),
	status: subscriptionStatusSchema.optional().default("active"),
});

export const updateSubscriptionSchema = z.object({
	subscription_id: z.string().optional(),
	user_id: z.string().optional(),
	plan_id: z.string().optional(),
	interval: z.enum(["month", "year"]).optional(),
	status: subscriptionStatusSchema.optional(),
	period_start: z.string().optional(),
	period_end: z.string().optional(),
	scheduled_tier: z.string().nullable().optional(),
	cancel_at_period_end: z.boolean().optional(),
});

export const upgradeSubscriptionSchema = z.object({
	target_tier: z.string().min(1),
	notes: z.string().max(1000).optional(),
	customer: z
		.object({
			name: z.string().optional(),
			email: z.string().email().optional(),
		})
		.optional(),
});

export const downgradeSubscriptionSchema = z.object({
	target_tier: z.string().min(1),
});

export const cancelSubscriptionSchema = z.object({
	subscription_id: z.string().optional(),
	cancel_at_period_end: z.boolean().optional().default(true),
});

export const restoreSubscriptionSchema = z.object({
	subscription_id: z.string().optional(),
});

export const hasAccessQuerySchema = z.object({
	user_id: z.string().optional(),
});

export const getSubscriptionSchema = z.object({
	/** If not admin, this field is ignored. @default "session.user.id" */
	user_id: z.string().optional(),
	subscription_id: z.string().optional(),
});

export const listSubscriptionSchema = z.object({
	user_id: z.string().optional(),
	status: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).default(50).optional(),
	offset: z.coerce.number().min(0).default(0).optional(),
});

export const billingCronSchema = z.object({
	secret: z.string().optional(),
	lead_days: z.number().int().min(1).max(14).optional(),
	grace_days: z.number().int().min(1).max(14).optional(),
});

export const subscriptionSchema = {
	[SUBSCRIPTION_TABLE_NAME]: {
		modelName: SUBSCRIPTION_TABLE_NAME,
		fields: {
			user_id: {
				type: "string",
				required: true,
				references: {
					field: "id",
					model: "user",
					onDelete: "cascade",
				},
			},
			plan_id: { type: "string", required: true },

			// subscription related
			status: { type: "string", required: true, defaultValue: "active" },
			interval: { type: "string", required: false },
			/** Current period start time */
			period_start: { type: "date", required: true },
			/** Current period end time */
			period_end: { type: "date", required: true },
			/** Current period end time (history) */
			ended_at: { type: "date", required: false },

			// scheduled downgrade tier (deferred to cycle-end)
			scheduled_tier: { type: "string", required: false },

			// grace period tracking
			grace_period_end: { type: "date", required: false },

			// cancelation related field
			cancel_at_period_end: {
				type: "boolean",
				required: false,
				defaultValue: false,
			},
			canceled_at: { type: "date", required: false },

			// trial
			trial_start: { type: "date", required: false },
			trial_end: { type: "date", required: false },

			// payment related
			invoice_id: { type: "string", required: false },
			order_id: { type: "string", required: false },
		},
	},
} satisfies BetterAuthPluginDBSchema;
