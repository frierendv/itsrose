import { z } from "zod/v4";

/* -------------------------------------------------------------------------- */
/*                              Upload vocabulary                             */
/* -------------------------------------------------------------------------- */

/**
 * The asset kinds the upload dialog offers.
 *
 * The API accepts any non-empty string as `kind`; the vocabulary is a
 * dashboard choice, so it is narrowed here rather than on the wire.
 */
export const assetKindSchema = z.enum([
	"voice_sample",
	"image",
	"audio",
	"video",
]);

export type AssetKind = z.infer<typeof assetKindSchema>;

/* -------------------------------------------------------------------------- */
/*                          Wire payloads (snake_case)                        */
/* -------------------------------------------------------------------------- */

/**
 * One durable asset, as `GET /assets` and `POST /assets` return it.
 *
 * The storage key is deliberately absent from the payload: reads are mediated
 * by a signed URL, so the object key never reaches the browser.
 */
export const assetSchema = z.object({
	asset_id: z.string(),
	kind: z.string(),
	filename: z.string(),
	size_bytes: z.int().nonnegative(),
	content_type: z.string(),
	created_at: z.string(),
});

export type Asset = z.infer<typeof assetSchema>;

/** The `GET /assets` page. The API has no total; `limit` and `offset` are the cursor. */
export const assetListSchema = z.object({
	items: z.array(assetSchema),
	limit: z.int().nonnegative(),
	offset: z.int().nonnegative(),
});

export type AssetList = z.infer<typeof assetListSchema>;

/** The signed read minted by `GET /assets/:asset_id/url`. */
export const assetUrlSchema = z.object({
	url: z.string(),
	expires_in: z.int().nonnegative(),
});

export type AssetUrl = z.infer<typeof assetUrlSchema>;

/** The `DELETE /assets/:asset_id` acknowledgement. */
export const assetDeleteSchema = z.object({
	deleted: z.boolean(),
});

export type AssetDelete = z.infer<typeof assetDeleteSchema>;

/* -------------------------------------------------------------------------- */
/*                             Envelope parsing                               */
/* -------------------------------------------------------------------------- */

const envelopeMetaSchema = z.record(z.string(), z.unknown()).default({});

/** The `@itsrose/api-response` success envelope, as far as assets rely on it. */
export const assetSuccessEnvelopeSchema = z.object({
	ok: z.literal(true),
	code: z.number(),
	message: z.string(),
	data: z.unknown(),
	errors: z.null(),
	meta: envelopeMetaSchema,
});

/** The `@itsrose/api-response` failure envelope. */
export const assetFailureEnvelopeSchema = z.object({
	ok: z.literal(false),
	code: z.number(),
	message: z.string(),
	data: z.null(),
	errors: z.record(z.string(), z.unknown()).nullish(),
	meta: envelopeMetaSchema,
});

export const assetEnvelopeSchema = z.discriminatedUnion("ok", [
	assetSuccessEnvelopeSchema,
	assetFailureEnvelopeSchema,
]);

export type AssetSuccessEnvelope = z.infer<typeof assetSuccessEnvelopeSchema>;
export type AssetFailureEnvelope = z.infer<typeof assetFailureEnvelopeSchema>;
export type AssetEnvelope = z.infer<typeof assetEnvelopeSchema>;

/**
 * A failed asset call, carrying the envelope's own diagnostic fields.
 *
 * The message is the envelope `message` (or a parser message when the body was
 * not an envelope at all), so `getErrorMessage` surfaces the server's wording
 * without extra handling at the call site.
 */
export class AssetApiError extends Error {
	readonly status?: number;
	readonly code?: number;
	readonly errors?: Record<string, unknown> | null;

	constructor(
		message: string,
		details: {
			status?: number;
			code?: number;
			errors?: Record<string, unknown> | null;
			cause?: unknown;
		} = {}
	) {
		super(message, { cause: details.cause });
		this.name = "AssetApiError";
		this.status = details.status;
		this.code = details.code;
		this.errors = details.errors;
	}
}

/**
 * Parses an HTTP response body into the standard envelope.
 *
 * A body that is not an envelope (an HTML error page, an empty body) is an
 * error of its own: it means the request never reached the asset routes.
 */
export function parseAssetEnvelope(
	payload: unknown,
	status?: number
): AssetEnvelope {
	const parsed = assetEnvelopeSchema.safeParse(payload);
	if (!parsed.success) {
		throw new AssetApiError(
			`The asset API returned an unexpected response (HTTP ${status ?? "unknown"}).`,
			{ status, cause: parsed.error }
		);
	}
	return parsed.data;
}

/**
 * Validates the envelope `data` field against one of the payload schemas.
 *
 * A successful response whose payload does not match the schema means the
 * dashboard and the API disagree on the contract, which is a bug rather than
 * a user-facing failure — but it still has to be surfaced, not swallowed.
 */
export function parseAssetData<T>(
	schema: z.ZodType<T>,
	data: unknown,
	status?: number
): T {
	const parsed = schema.safeParse(data);
	if (!parsed.success) {
		throw new AssetApiError(
			"The asset API returned a payload that does not match its schema.",
			{ status, cause: parsed.error }
		);
	}
	return parsed.data;
}
