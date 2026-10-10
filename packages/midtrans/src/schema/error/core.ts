import { z } from "zod/v4";

/* --------- Maybe core API error related --------  */
/**
 * Core API error responses.
 */
export const CoreErrorSchema = z
	.preprocess(
		(value) => {
			const { ...rest } = value as Record<string, unknown>;
			return {
				...rest,
				status_code_raw: rest.status_code,
			};
		},
		z.object({
			/**
			 * Unique identifier for this error.
			 */
			id: z.string().optional(),
			/**
			 * HTTP status code returned by Midtrans.
			 *
			 * ### Normalization
			 *
			 * Midtrans return the status code as a numeric
			 * string. Numeric strings are automatically converted to numbers before
			 * being exposed through this field.
			 *
			 * For example:
			 *
			 * ```ts
			 * 400    // => 400
			 * "401"  // => 401
			 * "404"  // => 404
			 * ```
			 *
			 * ### Validation
			 *
			 * The normalized value is an integer within the HTTP error status
			 * code range (`400`–`599`).
			 *
			 * This ensures to always receive a valid HTTP error status
			 * code even when Midtrans response contains an unexpected value.
			 *
			 * ### Original value
			 *
			 * If you need to access the exact value originally
			 * returned by Midtrans, use the `status_code_raw` field.
			 *
			 * @default 400
			 */
			status_code: z.coerce.number().min(400).max(599),
			/**
			 * Original `status_code` value returned by Midtrans.
			 */
			status_code_raw: z.string(),
			/**
			 * A message Midtrans tells about this error.
			 *
			 * Empty string if there is no message
			 * returned by midtrans API.
			 * @default
			 * ""
			 */
			status_message: z.string(),
			/**
			 * An array of string.
			 *
			 * Empty array if there is no validation messages
			 * returned by midtrans API.
			 *
			 * @example
			 * ```ts
			 * ["transaction_details.order_id is required"]
			 * ```
			 * @default
			 * []
			 */
			validation_messages: z.array(z.string()).optional(),
		})
	)
	.meta({
		title: "Midtrans Core API error fields",
		id: "MidtransErrorCoreApi",
	});

export type CoreError = z.infer<typeof CoreErrorSchema>;
