import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import {
	API_PLAN_TABLE_NAME,
	createRoute,
	isAdmin,
	normalizePlan,
} from "../../server";
import type { ApiPlan } from "../../types";

export const updatePlanSchema = z.object({
	plan_id: z.string().min(1),
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	prices: z
		.array(
			z.object({
				id: z.string().min(1),
				amount: z.number().int().positive(),
				currency: z.literal("IDR").default("IDR"),
				interval: z.enum(["month", "year"]),
			})
		)
		.optional(),
	features: z.array(z.string()).optional(),
	highlighted: z.boolean().optional(),
	seatBased: z.boolean().optional(),
});

export const updatePlanEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/plan/update"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: updatePlanSchema,
		},
		async (ctx) => {
			const { session, adapter } = ctx.context;

			if (!isAdmin(session.user)) {
				throw new APIError("FORBIDDEN", {
					message: "Admin role required to update billing plans.",
				});
			}

			const existing = await adapter.findOne<Record<string, unknown>>({
				model: API_PLAN_TABLE_NAME,
				where: [{ field: "plan_id", value: ctx.body.plan_id }],
			});

			if (!existing) {
				throw new APIError("NOT_FOUND", {
					message: `Plan with plan_id '${ctx.body.plan_id}' does not exist.`,
				});
			}

			const updatePayload: Record<string, unknown> = {};
			if (ctx.body.name !== undefined) {
				updatePayload.name = ctx.body.name;
			}
			if (ctx.body.description !== undefined) {
				updatePayload.description = ctx.body.description;
			}
			if (ctx.body.prices !== undefined) {
				updatePayload.prices = ctx.body.prices;
			}
			if (ctx.body.features !== undefined) {
				updatePayload.features = ctx.body.features;
			}
			if (ctx.body.highlighted !== undefined) {
				updatePayload.highlighted = String(ctx.body.highlighted);
			}
			if (ctx.body.seatBased !== undefined) {
				updatePayload.seatBased = ctx.body.seatBased;
			}

			const updated = await adapter.update<ApiPlan>({
				model: API_PLAN_TABLE_NAME,
				where: [{ field: "plan_id", value: ctx.body.plan_id }],
				update: updatePayload,
			});

			return ctx.json(
				normalizePlan((updated || existing) as Record<string, unknown>)
			);
		}
	);
};
