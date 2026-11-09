import { z } from "zod/v4";
import { CstoreStoreSchema } from "../../../shared";

export const OverTheCounterAlfmartExclusiveFieldsSchema = z.object({
	store: CstoreStoreSchema.extract(["alfamart"]),
	/**
	 * 1st row.
	 *
	 * @example "1st row of receipt,"
	 */
	alfamart_free_text_1: z.string().optional(),
	/**
	 * 2nd row.
	 *
	 * @example "This is the 2nd row,"
	 */
	alfamart_free_text_2: z.string().optional(),
	/**
	 * 3rd row.
	 *
	 * @example "3rd row. The end."
	 */
	alfamart_free_text_3: z.string().optional(),
});
export type OverTheCounterAlfmartExclusiveFields = z.infer<
	typeof OverTheCounterAlfmartExclusiveFieldsSchema
>;
