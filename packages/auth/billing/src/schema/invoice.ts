import type { BetterAuthPluginDBSchema } from "better-auth";
import { z } from "zod/v4";
import {
	INVOICE_EVENT_TABLE_NAME,
	INVOICE_SEQUENCE_TABLE_NAME,
	INVOICE_TABLE_NAME,
} from "../domain/constants";
import type {
	TransactionInvoiceCustomerDetails,
	TransactionInvoiceItemDetails,
} from "../types";
import { parseJson } from "./json";

export const createInvoiceSchema = z.object({
	plan_id: z.string().min(1),
	due_in_days: z.number().int().min(1).max(30).optional(),
	notes: z.string().max(1000).optional(),
	customer: z
		.object({
			name: z.string().optional(),
			email: z.string().email().optional(),
		})
		.optional(),
});

export const getInvoiceSchema = z.object({
	invoice_id: z.string().min(1),
});

export const listInvoiceSchema = z.object({
	status: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).default(50).optional(),
	offset: z.coerce.number().min(0).default(0).optional(),
	user_id: z.string().optional(),
	invoice_type: z.string().optional(),
});

export const listEventsSchema = z.object({
	limit: z.coerce.number().min(1).max(100).default(50).optional(),
	offset: z.coerce.number().min(0).default(0).optional(),
	event_name: z.string().optional(),
});

export const voidInvoiceSchema = z.object({
	invoice_id: z.string().min(1),
	reason: z.string().max(255).optional(),
});

export const invoiceSchema = {
	[INVOICE_TABLE_NAME]: {
		modelName: INVOICE_TABLE_NAME,
		fields: {
			invoice_id: { type: "string", unique: true, required: true },
			user_id: {
				type: "string",
				required: true,
				references: {
					field: "id",
					model: "user",
					onDelete: "set null",
				},
			},
			order_id: { type: "string", required: true },
			invoice_type: {
				type: "string",
				required: true,
				defaultValue: "NEW",
			},
			target_tier: { type: "string", required: true },
			status: { type: "string", required: true },
			invoice_date: { type: "string", required: true },
			due_date: { type: "string", required: true },
			invoice_number: { type: "string", required: true },
			payment_type: { type: "string", required: true },

			pdf_url: { type: "string", required: false },
			paid_pdf_url: { type: "string", required: false },
			paid_date: { type: "string", required: false },

			gross_amount: { type: "number", required: true },
			payment_link_url: { type: "string", required: true },
			customer_details: {
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
							return null;
						}
						return typeof value === "string"
							? parseJson<TransactionInvoiceCustomerDetails>(
									value
								)
							: (value as TransactionInvoiceCustomerDetails);
					},
				},
			},
			item_details: {
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
							return null;
						}
						return typeof value === "string"
							? parseJson<TransactionInvoiceItemDetails[]>(value)
							: (value as TransactionInvoiceItemDetails[]);
					},
				},
			},
			proration_details: {
				type: "string",
				required: false,
				transform: {
					input(value) {
						if (!value) {
							return null;
						}
						return typeof value === "string"
							? value
							: JSON.stringify(value);
					},
					output(value) {
						if (!value) {
							return null;
						}
						return typeof value === "string"
							? parseJson<Record<string, unknown>>(value)
							: value;
					},
				},
			},
		},
	},
	[INVOICE_SEQUENCE_TABLE_NAME]: {
		modelName: INVOICE_SEQUENCE_TABLE_NAME,
		fields: {
			year: { type: "number", required: true, unique: true },
			last_val: { type: "number", defaultValue: 0, required: false },
		},
	},
	[INVOICE_EVENT_TABLE_NAME]: {
		modelName: INVOICE_EVENT_TABLE_NAME,
		fields: {
			event_name: { type: "string", required: true },
			created_at: { type: "date", required: true },
			event_json: {
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
							return null;
						}
						return typeof value === "string"
							? parseJson<Record<string, unknown>>(value)
							: (value as Record<string, unknown>);
					},
				},
			},
		},
	},
} satisfies BetterAuthPluginDBSchema;
