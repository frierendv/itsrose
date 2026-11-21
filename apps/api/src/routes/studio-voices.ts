import { deny } from "@/lib/auth";
import type { ProviderResource } from "@itsrose/auth-resources/types";
import { tenantIdForUser } from "@itsrose/auth-usage/server";
import { ThirdPartyApiError } from "@itsrose/system";
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
 * One clone the caller owns, as the ledger records it.
 *
 * The upstream `voice_id` is the id the synthesis routes address; the
 * `resource_id` is our application identity and the one a delete addresses.
 */
const clonedVoiceItemSchema = z.object({
	voice_id: z.string(),
	name: z.string(),
	source: z.literal("cloned"),
	resource_id: z.string(),
	sample_asset_id: z.string().nullable(),
	created_at: z.string(),
});

/**
 * One platform catalogue voice.
 *
 * A premade voice has no ledger row, so it carries neither an application id
 * nor a sample asset: only the upstream object exists. Its preview is the
 * catalogue's own `preview_url`, kept nullable because a catalogue voice may
 * ship without one; a clone's preview is its sample asset instead.
 */
const premadeVoiceItemSchema = z.object({
	voice_id: z.string(),
	name: z.string(),
	source: z.literal("premade"),
	preview_url: z.string().nullable(),
});

const listResponseSchema = z.object({
	items: z.array(
		z.discriminatedUnion("source", [
			clonedVoiceItemSchema,
			premadeVoiceItemSchema,
		])
	),
});

/** The sample asset and the display name a clone request is built from. */
const createVoiceBodySchema = z.object({
	asset_id: z.string().min(1),
	name: z.string().min(1).max(100),
	description: z.string().optional(),
});

const createVoiceResponseSchema = z.object({
	resource_id: z.string(),
	voice_id: z.string(),
	name: z.string(),
	sample_asset_id: z.string(),
});

type ClonedVoiceItem = z.infer<typeof clonedVoiceItemSchema>;
type PremadeVoiceItem = z.infer<typeof premadeVoiceItemSchema>;
type VoiceItem = ClonedVoiceItem | PremadeVoiceItem;

/* -------------------------------------------------------------------------- */
/*                                  Mapping                                   */
/* -------------------------------------------------------------------------- */

/**
 * The row's timestamp as an ISO string.
 *
 * The adapter returns strings while the domain records `Date` objects; the
 * DTO exposes one shape to the caller.
 */
function toTimestamp(value: Date | string): string {
	return typeof value === "string" ? value : value.toISOString();
}

/**
 * The library DTO of one owned clone.
 *
 * The ledger row is the only source of ownership: an upstream voice the
 * caller does not own never appears in the list, whatever the catalogue says.
 */
function toClonedVoiceItem(record: ProviderResource): ClonedVoiceItem {
	return {
		voice_id: record.provider_resource_id,
		name: record.name,
		source: "cloned",
		resource_id: record.resource_id,
		sample_asset_id: record.sample_asset_id,
		created_at: toTimestamp(record.created_at),
	};
}

/* -------------------------------------------------------------------------- */
/*                                 Responses                                  */
/* -------------------------------------------------------------------------- */

function denySession(reply: FastifyReply): FastifyReply {
	return deny(reply, {
		code: "UNAUTHORIZED",
		message: "A dashboard session is required to use the voice library.",
		errors: {
			session: "Sign in to the dashboard and retry.",
		},
	});
}

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

/**
 * The session-only voice library: list the caller's clones plus the premade
 * catalogue, and clone a voice from an uploaded sample asset.
 *
 * Every route bypasses the API-key guard (`authGuard: false`), resolves the
 * Better Auth session itself and is hidden from the public OpenAPI document;
 * the dashboard is the only intended caller. Ownership is the ledger's
 * concern: the list is built from the caller's rows and only the platform's
 * premade catalogue is merged in, so another user's clone never appears.
 *
 * `@fastify/autoload` registers the files in `src/routes/` without a prefix
 * (only subdirectories get one), so the paths carry the `/studio/voices`
 * prefix.
 */
const studioVoicesRoutes: FastifyPluginAsync = async (
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
		method: "GET",
		url: "/studio/voices",
		config: { authGuard: false },
		preHandler: requireSession,
		schema: {
			hide: true,
			response: { 200: listResponseSchema },
		},
		handler: async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return denySession(reply);
			}

			// The owned list comes from the ledger, never from the upstream
			// catalogue: the catalogue holds every user's clones, so filtering
			// it by the ledger ids is the only way to keep a foreign clone out
			// of the caller's library.
			const [owned, visible] = await Promise.all([
				fastify.voiceService.list({ userId, kind: "voice" }),
				fastify.voiceAccess.listVisibleVoices(request, {}),
			]);

			const items: VoiceItem[] = [];
			const seen = new Set<string>();

			for (const record of owned) {
				const voiceId = record.provider_resource_id;
				if (seen.has(voiceId)) {
					continue;
				}

				seen.add(voiceId);
				items.push(toClonedVoiceItem(record));
			}

			for (const voice of visible.voices) {
				// Only the platform catalogue is public. A voice the caller
				// already owns was added above and wins over the catalogue
				// copy, so an owned clone is never duplicated as premade.
				const isPremade = voice.category === "premade";
				if (!isPremade || seen.has(voice.voice_id)) {
					continue;
				}

				seen.add(voice.voice_id);
				items.push({
					voice_id: voice.voice_id,
					name: voice.name,
					source: "premade",
					preview_url: voice.preview_url,
				});
			}

			return { items };
		},
	});

	routes.route({
		method: "POST",
		url: "/studio/voices",
		config: { authGuard: false },
		preHandler: requireSession,
		schema: {
			hide: true,
			body: createVoiceBodySchema,
			response: { 200: createVoiceResponseSchema },
		},
		handler: async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return denySession(reply);
			}

			const { asset_id, name, description } = request.body;

			// The asset row is the ownership check: a missing, soft-deleted or
			// foreign sample all raise `AssetNotFoundError` (404) before any
			// upstream clone is created.
			const sample = await fastify.assetService.readUrl({
				userId,
				assetId: asset_id,
			});

			const created = await fastify.voiceCloner.create({
				audioUrl: sample.url,
				name,
				description,
			});

			let record: ProviderResource;
			try {
				record = await fastify.voiceService.record({
					userId,
					tenantId: tenantIdForUser(userId),
					provider: "elevenlabs",
					providerResourceId: created.voice_id,
					name,
					sampleAssetId: asset_id,
				});
			} catch (error) {
				request.log.error(
					{ err: error, voice_id: created.voice_id },
					"The cloned voice was created upstream but could not be recorded against the caller."
				);

				// Compensate before answering: an upstream clone with no
				// ledger row is owned by nobody and can be neither listed nor
				// used, so it must not be left in the shared account.
				try {
					await fastify.voiceCloner.remove(created.voice_id);
				} catch (cleanupError) {
					request.log.error(
						{ err: cleanupError, voice_id: created.voice_id },
						"The unrecorded voice clone could not be removed upstream."
					);
				}

				// The upstream create already spent a voice slot and the
				// clone is gone again: the caller gets a gateway failure, not
				// the success it could neither list nor use.
				throw new ThirdPartyApiError(
					"The voice clone was created upstream but could not be registered, so it is not available to the caller.",
					502
				);
			}

			return {
				resource_id: record.resource_id,
				voice_id: created.voice_id,
				name,
				sample_asset_id: asset_id,
			};
		},
	});
};

export default studioVoicesRoutes;
