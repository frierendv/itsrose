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

export const createPlanSchema = z.object({
	plan_id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().optional().default(""),
	prices: z
		.array(
			z.object({
				id: z.string().min(1),
				amount: z.number().int().positive(),
				currency: z.literal("IDR").default("IDR"),
				interval: z.enum(["month", "year"]),
			})
		)
		.default([]),
	features: z.array(z.string()).default([]),
	highlighted: z.boolean().default(false),
});

export const createPlanEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/plan/create"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: createPlanSchema,
		},
		async (ctx) => {
			const { session, adapter } = ctx.context;

			if (!isAdmin(session.user)) {
				throw new APIError("FORBIDDEN", {
					message: "Admin role required to create billing plans.",
				});
			}

			const existing = await adapter.findOne<Record<string, unknown>>({
				model: API_PLAN_TABLE_NAME,
				where: [{ field: "plan_id", value: ctx.body.plan_id }],
			});

			if (existing) {
				throw new APIError("CONFLICT", {
					message: `Plan with plan_id '${ctx.body.plan_id}' already exists.`,
				});
			}

			const created = await adapter.create<Record<string, unknown>>({
				model: API_PLAN_TABLE_NAME,
				data: {
					plan_id: ctx.body.plan_id,
					name: ctx.body.name,
					description: ctx.body.description ?? "",
					prices: ctx.body.prices,
					features: ctx.body.features,
					highlighted: String(ctx.body.highlighted),
				},
			});

			return ctx.json(normalizePlan(created || { ...ctx.body }));
		}
	);
};
