import type { BetterAuthPluginDBSchema } from "better-auth";
import { parseJSON } from "better-auth/client";
import {
	INVOICE_EVENT_TABLE_NAME,
	INVOICE_SEQUENCE_TABLE_NAME,
	INVOICE_TABLE_NAME,
} from "../server/constants";
import type {
	TransactionInvoiceCustomerDetails,
	TransactionInvoiceItemDetails,
} from "../types";

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
							? parseJSON<TransactionInvoiceCustomerDetails>(
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
							? parseJSON<TransactionInvoiceItemDetails[]>(value)
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
							? parseJSON<Record<string, unknown>>(value)
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
							? parseJSON<Record<string, unknown>>(value)
							: (value as Record<string, unknown>);
					},
				},
			},
		},
	},
} satisfies BetterAuthPluginDBSchema;
