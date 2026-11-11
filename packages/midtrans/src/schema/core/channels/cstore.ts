import { z } from "zod/v4";
import { CstoreStoreSchema } from "../../primitives";

export const OverTheCounterBaseSchema = z.object({
	/** Convenience store retail partner. */
	store: CstoreStoreSchema,
	/** Message displayed on the payment slip or cashier POS. */
	message: z.string().max(50).optional(),
});
export type OverTheCounterBase = z.infer<typeof OverTheCounterBaseSchema>;

export const OverTheCounterAlfmartExclusiveFieldsSchema = z.object({
	store: CstoreStoreSchema.extract(["alfamart"]),
	/** 1st row. */
	alfamart_free_text_1: z.string().optional(),
	/** 2nd row. */
	alfamart_free_text_2: z.string().optional(),
	/** 3rd row. */
	alfamart_free_text_3: z.string().optional(),
});
export type OverTheCounterAlfmartExclusiveFields = z.infer<
	typeof OverTheCounterAlfmartExclusiveFieldsSchema
>;

/**
 * Over The Counter (cstore) parameters for Indomaret or Alfamart.
 */
export const OverTheCounterSchema = z.discriminatedUnion("store", [
	OverTheCounterBaseSchema,
	OverTheCounterAlfmartExclusiveFieldsSchema,
]);
export type OverTheCounter = z.infer<typeof OverTheCounterSchema>;
