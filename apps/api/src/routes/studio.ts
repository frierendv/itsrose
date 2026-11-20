import { deny } from "@/lib/auth";
import { createSessionGuard } from "@/lib/session";
import type { Generation } from "@itsrose/auth-resources/types";
import { GENERATION_FEATURES } from "@itsrose/auth-resources/types";
import { tenantIdForUser } from "@itsrose/auth-usage/server";
import { SystemError } from "@itsrose/system";
import type {
	FastifyInstance,
	FastifyPluginAsync,
	FastifyReply,
} from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { z } from "zod/v4";

/* -------------------------------------------------------------------------- */
/*                                  Schemas                                   */
/* -------------------------------------------------------------------------- */

const speechBodySchema = z.object({
	text: z.string().min(1).max(5000),
	voice_id: z.string().min(1),
	model_id: z.string().optional(),
	output_format: z.string().optional(),
});

const speechResponseSchema = z.object({
	generation_id: z.string(),
	audio_url: z.string(),
	expires_at: z.string(),
	saved: z.boolean(),
});

const generationsQuerySchema = z.object({
	feature: z.enum(GENERATION_FEATURES).optional(),
	limit: z.coerce.number().min(1).max(100).pipe(z.int()).default(20),
	offset: z.coerce.number().min(0).pipe(z.int()).default(0),
});

const generationItemSchema = z.object({
	generation_id: z.string(),
	feature: z.enum(GENERATION_FEATURES),
	status: z.string(),
	input_text: z.string().nullable(),
	created_at: z.string(),
	expires_at: z.string().nullable(),
	saved: z.boolean(),
	asset_id: z.string().nullable(),
	expired: z.boolean(),
});

const generationsResponseSchema = z.object({
	items: z.array(generationItemSchema),
	limit: z.int(),
	offset: z.int(),
});

const generationParamsSchema = z.object({
	generation_id: z.string().min(1),
});

const generationUrlResponseSchema = z.object({
	url: z.string(),
	expires_in: z.int(),
	source: z.enum(["library", "generated"]),
});

const saveGenerationBodySchema = z.object({
	filename: z.string().min(1).optional(),
});

const saveGenerationResponseSchema = z.object({
	asset_id: z.string(),
	saved: z.boolean(),
	already_saved: z.boolean().optional(),
});

const deleteGenerationResponseSchema = z.object({
	deleted: z.boolean(),
});

/* -------------------------------------------------------------------------- */
/*                                  Mapping                                   */
/* -------------------------------------------------------------------------- */

type GenerationItem = z.infer<typeof generationItemSchema>;
type GenerationUrlResponse = z.infer<typeof generationUrlResponseSchema>;
type SaveGenerationResponse = z.infer<typeof saveGenerationResponseSchema>;

/** The default filename extension, used when the row carries no audio type. */
const DEFAULT_AUDIO_EXTENSION = "mp3";

/** The extension each generated audio content type saves under. */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
	"audio/mpeg": "mp3",
	"audio/wav": "wav",
	"audio/ogg": "ogg",
};

/**
 * The row's timestamp as an ISO string.
 *
 * The adapter returns strings while the domain records `Date` objects; the DTO
 * exposes one shape to the caller.
 */
function toTimestamp(value: Date | string): string {
	return typeof value === "string" ? value : value.toISOString();
}

/**
 * The row's timestamp as a date, or `null` when the column is empty.
 */
function toDate(value: Date | string | null): Date | null {
	if (value === null) {
		return null;
	}
	return value instanceof Date ? value : new Date(value);
}

/**
 * Whether an unsaved result is past the generated class's deadline.
 *
 * A saved result is never expired: its durable copy answers through
 * `result_asset_id`. A row that names an ephemeral object but carries no
 * deadline cannot prove the object is alive, so it is treated as expired — the
 * lifecycle rule may already have removed the object.
 */
function isExpired(row: Generation, now: Date): boolean {
	if (row.result_asset_id !== null || row.result_key === null) {
		return false;
	}

	const deadline = toDate(row.expires_at);
	return deadline === null || deadline.getTime() <= now.getTime();
}

/**
 * The deadline of a result that was just stored.
 *
 * `record` sets `expires_at` exactly when it is given a `result_key`, so a row
 * that names a stored object but carries no deadline is a wiring error rather
 * than a `null` to hand to the caller.
 */
function storedDeadline(row: Generation): string {
	const deadline = toDate(row.expires_at);
	if (deadline === null) {
		throw new SystemError(
			`Generation "${row.generation_id}" has no expiry despite storing a result.`
		);
	}
	return deadline.toISOString();
}

/**
 * The default filename of a saved result.
 *
 * The caller may name the copy; when it does not, the generation id and the
 * content type the row recorded produce a stable, kind-correct name.
 */
function defaultFilename(row: Generation): string {
	const contentType = row.result_content_type;
	const extension =
		contentType === null
			? DEFAULT_AUDIO_EXTENSION
			: (EXTENSION_BY_CONTENT_TYPE[
					contentType.split(";")[0]?.trim().toLowerCase() ?? ""
				] ?? DEFAULT_AUDIO_EXTENSION);

	return `${row.generation_id}.${extension}`;
}

/**
 * The history DTO of one generation row.
 *
 * `expired` is derived, never stored: the row's deadline and the current time
 * answer it, and a saved result answers through its durable asset.
 */
function toGenerationItem(row: Generation, now: Date): GenerationItem {
	return {
		generation_id: row.generation_id,
		feature: row.feature,
		status: row.status,
		input_text: row.input_text,
		created_at: toTimestamp(row.created_at),
		expires_at:
			row.expires_at === null ? null : toTimestamp(row.expires_at),
		saved: row.result_asset_id !== null,
		asset_id: row.result_asset_id,
		expired: isExpired(row, now),
	};
}

/* -------------------------------------------------------------------------- */
/*                                 Responses                                  */
/* -------------------------------------------------------------------------- */

/**
 * The failure of a result the bucket may already have removed.
 *
 * The 410 is produced here, from the row the handler is holding, rather than
 * thrown and mapped: expiry is derived from the row (`isExpired`), so the
 * route owns the decision and no domain error exists to reuse.
 */
function denyExpiredResult(
	reply: FastifyReply,
	row: Generation,
	action: "read" | "saved"
): FastifyReply {
	return deny(reply, {
		code: "GONE",
		message: `The generated result has expired and can no longer be ${action}.`,
		errors: { generation_id: row.generation_id },
	});
}

/** The failure of a row that never stored a result to hand back. */
function denyMissingResult(reply: FastifyReply, row: Generation): FastifyReply {
	return deny(reply, {
		code: "NOT_FOUND",
		message: "The generation has no stored result.",
		errors: { generation_id: row.generation_id },
	});
}

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

/**
 * The session-only studio surface: generate speech, read history, mint result
 * URLs, save a result to the library and clear history.
 *
 * Every route bypasses the API-key guard (`authGuard: false`), resolves the
 * Better Auth session through the shared guard and is hidden from the public
 * OpenAPI document; the dashboard is the only intended caller. Ownership is
 * the ledger's concern: `find` scopes the lookup by the session user, so a
 * foreign row and a missing one both raise `GenerationNotFoundError`.
 *
 * `@fastify/autoload` registers the files in `src/routes/` without a prefix
 * (only subdirectories get one), so the paths carry the `/studio` prefix.
 */
const studioRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance
): Promise<void> => {
	const session = createSessionGuard(
		fastify.auth,
		"A dashboard session is required to use the studio."
	);

	const routes = fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>();

	routes.route({
		method: "POST",
		url: "/studio/speech",
		config: { authGuard: false },
		preHandler: session.preHandler,
		schema: {
			hide: true,
			body: speechBodySchema,
			response: { 200: speechResponseSchema },
		},
		handler: async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return session.deny(reply);
			}

			const { text, voice_id, model_id, output_format } = request.body;

			// The caller may only synthesise with a voice it owns or a
			// premade one; a foreign clone and an unknown id both answer 404.
			await fastify.voiceAccess.assertCanUseVoice(request, voice_id);

			const audio = await fastify.studioSpeech.generate({
				text,
				voice_id,
				model_id,
				output_format,
			});

			const stored = await fastify.studioStore.putGenerated({
				userId,
				data: audio.data,
				contentType: audio.contentType,
			});

			const generation = await fastify.generationService.record({
				userId,
				tenantId: tenantIdForUser(userId),
				feature: "text_to_speech",
				provider: "elevenlabs",
				inputText: text,
				inputParams: JSON.stringify({
					voice_id,
					model_id,
					output_format,
				}),
				resultKey: stored.key,
				resultContentType: audio.contentType,
			});

			return {
				generation_id: generation.generation_id,
				audio_url: stored.url,
				expires_at: storedDeadline(generation),
				saved: false,
			};
		},
	});

	routes.route({
		method: "GET",
		url: "/studio/generations",
		config: { authGuard: false },
		preHandler: session.preHandler,
		schema: {
			hide: true,
			querystring: generationsQuerySchema,
			response: { 200: generationsResponseSchema },
		},
		handler: async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return session.deny(reply);
			}

			const { feature, limit, offset } = request.query;
			const rows = await fastify.generationService.list({
				userId,
				feature,
				limit,
				offset,
			});
			const now = new Date();

			return {
				items: rows.map((row) => toGenerationItem(row, now)),
				limit,
				offset,
			};
		},
	});

	routes.route({
		method: "GET",
		url: "/studio/generations/:generation_id/url",
		config: { authGuard: false },
		preHandler: session.preHandler,
		schema: {
			hide: true,
			params: generationParamsSchema,
			response: { 200: generationUrlResponseSchema },
		},
		handler: async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return session.deny(reply);
			}

			const row = await fastify.generationService.find({
				userId,
				generationId: request.params.generation_id,
			});

			// A saved result answers with the library's signed URL, whatever
			// happened to the ephemeral copy it was promoted from.
			if (row.result_asset_id !== null) {
				const assetUrl = await fastify.assetService.readUrl({
					userId,
					assetId: row.result_asset_id,
				});

				return {
					url: assetUrl.url,
					expires_in: assetUrl.expires_in,
					source: "library",
				} satisfies GenerationUrlResponse;
			}

			if (row.result_key === null) {
				return denyMissingResult(reply, row);
			}

			const now = new Date();
			const deadline = toDate(row.expires_at);
			if (deadline === null || deadline.getTime() <= now.getTime()) {
				return denyExpiredResult(reply, row, "read");
			}

			return {
				url: fastify.studioStore.publicUrl(row.result_key),
				expires_in: Math.max(
					0,
					Math.floor((deadline.getTime() - now.getTime()) / 1000)
				),
				source: "generated",
			} satisfies GenerationUrlResponse;
		},
	});

	routes.route({
		method: "POST",
		url: "/studio/generations/:generation_id/save",
		config: { authGuard: false },
		preHandler: session.preHandler,
		schema: {
			hide: true,
			params: generationParamsSchema,
			body: saveGenerationBodySchema,
			response: { 200: saveGenerationResponseSchema },
		},
		handler: async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return session.deny(reply);
			}

			const row = await fastify.generationService.find({
				userId,
				generationId: request.params.generation_id,
			});

			// Saving twice is one outcome: the first save already linked the
			// durable asset, and the caller gets the same id back.
			if (row.result_asset_id !== null) {
				return {
					asset_id: row.result_asset_id,
					saved: true,
					already_saved: true,
				} satisfies SaveGenerationResponse;
			}

			if (isExpired(row, new Date())) {
				return denyExpiredResult(reply, row, "saved");
			}

			if (row.result_key === null) {
				return denyMissingResult(reply, row);
			}

			const asset = await fastify.assetService.promote({
				userId,
				tenantId: tenantIdForUser(userId),
				kind: "audio",
				filename: request.body.filename ?? defaultFilename(row),
				sourceKey: row.result_key,
			});

			await fastify.generationService.markSaved({
				userId,
				generationId: row.generation_id,
				assetId: asset.asset_id,
			});

			return {
				asset_id: asset.asset_id,
				saved: true,
			} satisfies SaveGenerationResponse;
		},
	});

	routes.route({
		method: "DELETE",
		url: "/studio/generations/:generation_id",
		config: { authGuard: false },
		preHandler: session.preHandler,
		schema: {
			hide: true,
			params: generationParamsSchema,
			response: { 200: deleteGenerationResponseSchema },
		},
		handler: async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return session.deny(reply);
			}

			const row = await fastify.generationService.find({
				userId,
				generationId: request.params.generation_id,
			});

			// An unsaved result has only the ephemeral object, so that object
			// goes first: a failed delete leaves the row as the retry
			// manifest and a retry is safe. A saved result's library copy is
			// durable, so only the history row is cleared.
			if (row.result_asset_id === null && row.result_key !== null) {
				await fastify.studioStore.remove(row.result_key);
			}

			await fastify.generationService.remove({
				userId,
				generationId: row.generation_id,
			});

			return { deleted: true };
		},
	});
};

export default studioRoutes;
