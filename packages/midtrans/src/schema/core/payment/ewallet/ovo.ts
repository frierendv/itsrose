import { z } from "zod/v4";

export const OvoFieldsSchema = z.object({
	/**
	 * Customer's phone number that will be used to create payment request to OVO.
	 */
	payer_phone_number: z.string(),
});
export type OvoFields = z.infer<typeof OvoFieldsSchema>;
