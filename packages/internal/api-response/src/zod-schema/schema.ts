import { z } from "zod/v4";

const withMeta = <S extends z.ZodTypeAny>(
	schema: S,
	title: string,
	description: string
) => schema.meta({ title, description });

const codeSchema = withMeta(
	z.number(),
	"Response code",
	"The numeric code representing the success status."
);

const messageSchema = withMeta(
	z.string(),
	"Response message",
	"A human-readable message providing additional information."
);

const metaSchema = withMeta(
	z.record(z.string(), z.unknown()).default({}),
	"Metadata",
	"Additional metadata related to the response. **Do not** rely on this field for any critical information, as it may be omitted or changed without notice."
);

export const SuccessSchema = z
	.object({
		ok: withMeta(
			z.literal(true),
			"Success indicator",
			"Indicates that the response represents a successful operation."
		),
		code: codeSchema,
		message: messageSchema,
		data: withMeta(
			z.unknown(),
			"Response data",
			"The data field contains the successful response payload."
		),
		errors: withMeta(
			z.null(),
			"No errors on success responses",
			"The errors field is always null for success responses."
		),
		meta: metaSchema,
	})
	.describe("Success request.")
	.meta({
		title: "Success Response Schema",
		description: "Representing a successful response.",
		id: "SuccessSchema",
	});
export const FailureSchema = z
	.object({
		ok: withMeta(
			z.literal(false),
			"Failure indicator",
			"Indicates that the response represents a failed operation."
		),
		code: withMeta(
			z.number(),
			"Response code",
			"The numeric code representing the failure status."
		),
		message: messageSchema,
		data: withMeta(
			z.null(),
			"No data on failure responses",
			"The data field is always null for failure responses."
		),
		errors: withMeta(
			z.record(z.string(), z.unknown()).default({}),
			"Error details",
			"The errors field contains details about the failure. It is optional and may be omitted if no additional error information is provided."
		),
		meta: metaSchema,
	})
	.describe("Failure request.")
	.meta({
		title: "Failure Response Schema",
		description: "Representing a failed response.",
		id: "FailureSchema",
	});
export const ResponseSchema = z.union([SuccessSchema, FailureSchema]);
