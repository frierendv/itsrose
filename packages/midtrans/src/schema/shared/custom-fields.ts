import { z } from "zod/v4";

/**
 * Custom fields 1 to 3 used as additional transaction metadata tags.
 */
export const CustomFieldsSchema = z
	.object({
		custom_field1: z.string().max(255),
		custom_field2: z.string().max(255),
		custom_field3: z.string().max(255),
	})
	.partial()
	.meta({
		id: "MidtransCustomFields",
	});

export type CustomFields = z.infer<typeof CustomFieldsSchema>;
