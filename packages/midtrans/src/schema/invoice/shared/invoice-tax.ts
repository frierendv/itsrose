import { z } from "zod/v4";

export const InvoiceTaxModeSchema = z.enum(["inclusive", "exclusive"]).meta({
	id: "MidtransInvoiceTaxMode",
});
export type InvoiceTaxMode = z.infer<typeof InvoiceTaxModeSchema>;

export const InvoiceTaxSchema = z.object({
	/**
	 * Tax label shown in the invoice, for example PPN.
	 */
	name: z.string(),
	/**
	 * Tax calculation type.
	 */
	type: z.enum(["percentage", "fixed"]),
	/**
	 * Tax amount value. If type is percentage, use percent value (for example 10 means 10%).
	 * If `taxes[].type` is set to `fixed`, use nominal amount.
	 */
	value: z.number().positive(),
});
export type InvoiceTax = z.infer<typeof InvoiceTaxSchema>;

export const InvoiceTaxesSchema = z.discriminatedUnion("tax_mode", [
	z.object({
		tax_mode: InvoiceTaxModeSchema.extract(["inclusive"]),
		taxes: InvoiceTaxSchema.array(),
	}),
	z.object({
		tax_mode: InvoiceTaxModeSchema.extract(["exclusive"]).nullish(),
		taxes: InvoiceTaxSchema.array().optional(),
	}),
]);
export type InvoiceTaxes = z.infer<typeof InvoiceTaxesSchema>;
