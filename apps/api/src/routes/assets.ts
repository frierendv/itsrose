import { deny } from "@/lib/auth";
import type { AssetRecord } from "@itsrose/auth-storage/types";
import { tenantIdForUser } from "@itsrose/auth-usage/server";
import type {
	FastifyInstance,
	FastifyPluginAsync,
	FastifyReply,
	FastifyRequest,
} from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { z } from "zod/v4";

/* -------------------------------------------------------------------------- */
/*                                  Schemas                                   */
/* -------------------------------------------------------------------------- */

/**
 * The asset as the dashboard sees it.
 *
 * `key` is deliberately absent: the object key is a server implementation
 * detail and a signed URL is minted on read instead.
 */
const assetSchema = z.object({
	asset_id: z.string(),
	kind: z.string(),
	filename: z.string(),
	size_bytes: z.int().nonnegative(),
	content_type: z.string(),
	created_at: z.string(),
});

const listQuerySchema = z.object({
	limit: z.coerce.number().min(1).max(200).pipe(z.int()).default(50),
	offset: z.coerce.number().min(0).pipe(z.int()).default(0),
});

const listResponseSchema = z.object({
	items: z.array(assetSchema),
	limit: z.int(),
	offset: z.int(),
});

const assetParamsSchema = z.object({
	asset_id: z.string().min(1),
});

const assetUrlSchema = z.object({
	url: z.string(),
	expires_in: z.int(),
});

const deleteResponseSchema = z.object({
	deleted: z.boolean(),
});

type AssetResponse = z.infer<typeof assetSchema>;

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

/** The filename used when the parser could not preserve the part headers. */
const FALLBACK_FILENAME = "upload";

/** The content type used when the parser could not preserve the part headers. */
const FALLBACK_CONTENT_TYPE = "application/octet-stream";

type UploadFile = {
	filename: string;
	mimetype: string;
	bytes: Buffer;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A file part kept as an object (`attachFieldsToBody: true`).
 *
 * The app configures `keyValues`, which hands the handler a `Buffer`; this
 * shape stays accepted so the route does not silently depend on one parser
 * mode.
 */
type MultipartFilePart = {
	filename: string;
	mimetype: string;
	toBuffer: () => Promise<Buffer>;
};

function isFilePart(value: unknown): value is MultipartFilePart {
	return (
		isRecord(value) &&
		typeof value.filename === "string" &&
		typeof value.mimetype === "string" &&
		typeof value.toBuffer === "function"
	);
}

function toAssetResponse(record: AssetRecord): AssetResponse {
	return {
		asset_id: record.asset_id,
		kind: record.kind,
		filename: record.filename,
		size_bytes: record.size_bytes,
		content_type: record.content_type,
		created_at:
			typeof record.created_at === "string"
				? record.created_at
				: record.created_at.toISOString(),
	};
}

/**
 * Reads the uploaded file from a parsed multipart body.
 *
 * `keyValues` flattens the part to its bytes and the parser records the part
 * headers on the request (`uploadedFileParts`); a file part kept as an object
 * carries the headers itself.
 */
async function readUploadFile(
	request: FastifyRequest
): Promise<UploadFile | null> {
	const body = request.body;
	if (!isRecord(body)) {
		return null;
	}

	const entry = body.file;
	if (Buffer.isBuffer(entry)) {
		const part = request.uploadedFileParts?.file;
		return {
			filename: part?.filename ?? FALLBACK_FILENAME,
			mimetype: part?.mimetype ?? FALLBACK_CONTENT_TYPE,
			bytes: entry,
		};
	}

	if (isFilePart(entry)) {
		return {
			filename: entry.filename,
			mimetype: entry.mimetype,
			bytes: await entry.toBuffer(),
		};
	}

	return null;
}

/* -------------------------------------------------------------------------- */
/*                                 Responses                                  */
/* -------------------------------------------------------------------------- */

function denySession(reply: FastifyReply): FastifyReply {
	return deny(reply, {
		code: "UNAUTHORIZED",
		message: "A dashboard session is required to use the asset library.",
		errors: {
			session: "Sign in to the dashboard and retry.",
		},
	});
}

function denyUpload(reply: FastifyReply): FastifyReply {
	return deny(reply, {
		code: "MISSING_REQUIRED_FIELD",
		message: "An asset upload needs both a `kind` field and a `file` part.",
		errors: {
			upload: "Send a multipart form with `kind` and `file`.",
		},
	});
}

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

/**
 * The session-only asset library.
 *
 * Every route bypasses the API-key guard (`authGuard: false`), resolves the
 * Better Auth session itself and is hidden from the public OpenAPI document;
 * the dashboard is the only intended caller.
 *
 * `@fastify/autoload` registers the files in `src/routes/` without a prefix
 * (only subdirectories get one), so the paths carry the `/assets` prefix.
 */
const assetsRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance
): Promise<void> => {
	const requireSession = async (
		request: FastifyRequest,
		reply: FastifyReply
	): Promise<FastifyReply | void> => {
		const session = await fastify.auth.api.getSession({
			headers: request.headers as unknown as Headers,
		});

		if (!session?.user) {
			return denySession(reply);
		}

		request.userId = session.user.id;
	};

	const routes = fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>();

	routes.route({
		method: "POST",
		url: "/assets",
		config: { authGuard: false },
		preHandler: requireSession,
		// No body schema: the multipart parser consumes the request first and
		// `keyValues` flattens it into a plain object.
		schema: {
			hide: true,
			response: { 200: assetSchema },
		},
		handler: async (request, reply) => {
			const body = request.body;
			const kind = isRecord(body) ? body.kind : undefined;
			const file = await readUploadFile(request);

			if (typeof kind !== "string" || kind.length === 0 || !file) {
				return denyUpload(reply);
			}

			const userId = request.userId;
			if (!userId) {
				return denySession(reply);
			}

			const asset = await fastify.assetService.upload({
				userId,
				tenantId: tenantIdForUser(userId),
				kind,
				filename: file.filename,
				body: file.bytes,
				contentType: file.mimetype,
			});

			return toAssetResponse(asset);
		},
	});

	routes.route({
		method: "GET",
		url: "/assets",
		config: { authGuard: false },
		preHandler: requireSession,
		schema: {
			hide: true,
			querystring: listQuerySchema,
			response: { 200: listResponseSchema },
		},
		handler: async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return denySession(reply);
			}

			const { limit, offset } = request.query;
			const items = await fastify.assetService.list({
				userId,
				limit,
				offset,
			});

			return {
				items: items.map(toAssetResponse),
				limit,
				offset,
			};
		},
	});

	routes.route({
		method: "GET",
		url: "/assets/:asset_id/url",
		config: { authGuard: false },
		preHandler: requireSession,
		schema: {
			hide: true,
			params: assetParamsSchema,
			response: { 200: assetUrlSchema },
		},
		handler: async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return denySession(reply);
			}

			const assetUrl = await fastify.assetService.readUrl({
				userId,
				assetId: request.params.asset_id,
			});

			return assetUrl;
		},
	});

	routes.route({
		method: "DELETE",
		url: "/assets/:asset_id",
		config: { authGuard: false },
		preHandler: requireSession,
		schema: {
			hide: true,
			params: assetParamsSchema,
			response: { 200: deleteResponseSchema },
		},
		handler: async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return denySession(reply);
			}

			const deleted = await fastify.assetService.remove({
				userId,
				assetId: request.params.asset_id,
			});

			return { deleted };
		},
	});
};

export default assetsRoutes;
