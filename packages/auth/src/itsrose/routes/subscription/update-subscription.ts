import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import {
	getUserSubscription,
	invalidateUserSubscriptionCache,
} from "../../adapter";
import { createRoute, isAdmin, SUBSCRIPTION_TABLE_NAME } from "../../server";
import type {
	BillingInterval,
	ItsRosePluginOptions,
	Subscription,
	SubscriptionStatus,
} from "../../types";

export const updateSubscriptionSchema = z.object({
	subscription_id: z.string().optional(),
	userId: z.string().optional(),
	plan_id: z.string().optional(),
	interval: z.enum(["month", "year"]).optional(),
	status: z
		.enum(["active", "pending_payment", "past_due", "expired", "canceled"])
		.optional(),
	period_start: z.string().optional(),
	period_end: z.string().optional(),
	scheduled_tier: z.string().nullable().optional(),
	cancel_at_period_end: z.boolean().optional(),
});

export const updateSubscriptionEndpoint = (_opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/update"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: updateSubscriptionSchema,
		},
		async (ctx) => {
			const { session, adapter } = ctx.context;

			if (!isAdmin(session.user)) {
				throw new APIError("FORBIDDEN", {
					message: "Admin role required to update subscriptions.",
				});
			}

			let existing: Subscription | null = null;
			if (ctx.body.subscription_id) {
				existing = await adapter.findOne<Subscription>({
					model: SUBSCRIPTION_TABLE_NAME,
					where: [{ field: "id", value: ctx.body.subscription_id }],
				});
			} else if (ctx.body.userId) {
				existing = await getUserSubscription(ctx, ctx.body.userId);
			}

			if (!existing) {
				throw new APIError("NOT_FOUND", {
					message: "Subscription record not found.",
				});
			}

			const updatePayload: Partial<Subscription> = {};
			if (ctx.body.plan_id !== undefined) {
				updatePayload.plan_id = ctx.body.plan_id;
			}
			if (ctx.body.interval !== undefined) {
				updatePayload.interval = ctx.body.interval as BillingInterval;
			}
			if (ctx.body.status !== undefined) {
				updatePayload.status = ctx.body.status as SubscriptionStatus;
			}
			if (ctx.body.period_start !== undefined) {
				updatePayload.period_start = new Date(ctx.body.period_start);
			}
			if (ctx.body.period_end !== undefined) {
				updatePayload.period_end = new Date(ctx.body.period_end);
			}
			if (ctx.body.scheduled_tier !== undefined) {
				updatePayload.scheduled_tier = ctx.body.scheduled_tier;
			}
			if (ctx.body.cancel_at_period_end !== undefined) {
				updatePayload.cancel_at_period_end =
					ctx.body.cancel_at_period_end;
			}

			await adapter.update({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "id", value: existing.id }],
				update: updatePayload,
			});

			await invalidateUserSubscriptionCache(ctx, existing.user_id);

			const updated = await adapter.findOne<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "id", value: existing.id }],
			});

			return ctx.json(updated || { ...existing, ...updatePayload });
		}
	);
};
