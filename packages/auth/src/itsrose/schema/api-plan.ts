import type { BetterAuthPluginDBSchema } from "better-auth";
import { parseJSON } from "better-auth/client";
import { API_PLAN_TABLE_NAME } from "../server/constants";
import type { PlanPrice } from "../types";

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
							? parseJSON<PlanPrice>(value)
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
							? parseJSON<string[]>(value)
							: (value as string[]);
					},
				},
			},
			highlighted: {
				type: "boolean",
				defaultValue: false,
				required: false,
			},
		},
	},
} satisfies BetterAuthPluginDBSchema;
