import type { BetterAuthPluginDBSchema } from "better-auth";
import { z } from "zod/v4";
import { API_PLAN_TABLE_NAME } from "../domain/constants";
import type { PlanPrice } from "../types";
import { parseJson } from "./json";

export const planPriceInputSchema = z.object({
	/** Legacy catalog id; discarded when persisting the canonical price. */
	id: z.string().min(1).optional(),
	amount: z.number().int().positive(),
	currency: z.literal("IDR").default("IDR"),
	interval: z.enum(["month", "year"]),
});

export const createPlanSchema = z.object({
	plan_id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().optional().default(""),
	prices: z.array(planPriceInputSchema).default([]),
	price: planPriceInputSchema.optional(),
	features: z.array(z.string()).default([]),
	/** Monthly billable request allowance; `null` means unlimited. */
	quota_requests: z.number().int().min(0).nullable().optional(),
	highlighted: z.boolean().default(false),
});

export const updatePlanSchema = z.object({
	plan_id: z.string().min(1),
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	prices: z.array(planPriceInputSchema).optional(),
	price: planPriceInputSchema.optional(),
	features: z.array(z.string()).optional(),
	quota_requests: z.number().int().min(0).nullable().optional(),
	highlighted: z.boolean().optional(),
	/** Accepted for dashboard compatibility; not persisted by the catalog schema. */
	seatBased: z.boolean().optional(),
});

export const deletePlanSchema = z.object({
	plan_id: z.string().min(1),
});

export const seedPlansSchema = z.object({
	force: z.boolean().optional().default(false),
});

export const getPlanSchema = z.object({
	plan_id: z.string(),
});

export const apiPlanSchema = {
	[API_PLAN_TABLE_NAME]: {
		modelName: API_PLAN_TABLE_NAME,
		fields: {
			plan_id: { type: "string", required: true, unique: true },
			name: { type: "string", required: true },
			description: { type: "string", required: false },
			price: {
				type: "string",
				required: true,
				transform: {
					input(value) {
						return typeof value === "string"
							? value
							: JSON.stringify(value);
					},
					output(value) {
						if (!value) {
							return {};
						}
						return typeof value === "string"
							? parseJson<PlanPrice>(value)
							: (value as PlanPrice);
					},
				},
			},
			features: {
				type: "string",
				required: false,
				transform: {
					input(value) {
						return typeof value === "string"
							? value
							: JSON.stringify(value);
					},
					output(value) {
						if (!value) {
							return [];
						}
						return typeof value === "string"
							? parseJson<string[]>(value)
							: (value as string[]);
					},
				},
			},
			/** Monthly billable request allowance; `null` means unlimited. */
			quota_requests: {
				type: "number",
				required: false,
			},
			highlighted: {
				type: "boolean",
				defaultValue: false,
				required: false,
			},
		},
	},
} satisfies BetterAuthPluginDBSchema;
