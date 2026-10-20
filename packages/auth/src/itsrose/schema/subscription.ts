import type { BetterAuthPluginDBSchema } from "better-auth";
import { SUBSCRIPTION_TABLE_NAME } from "../server/constants";

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
