import { z } from "zod/v4";
import { OverTheCounterAlfmartExclusiveFieldsSchema } from "./alfamart-exclusive";
import { OverTheCounterBaseSchema } from "./over-the-counter-base";

/**
 * Over The Counter (cstorage) parameters for Indomaret or Alfamart.
 */
export const OverTheCounterSchema = z.discriminatedUnion("store", [
	OverTheCounterBaseSchema,
	OverTheCounterAlfmartExclusiveFieldsSchema,
]);
export type OverTheCounter = z.infer<typeof OverTheCounterSchema>;
