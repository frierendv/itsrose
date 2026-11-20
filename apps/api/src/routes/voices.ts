import { deny } from "@/lib/auth";
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

const deleteVoiceParamsSchema = z.object({
	voice_id: z.string().min(1),
});

const deleteVoiceResponseSchema = z.object({
	deleted: z.boolean(),
});

/* -------------------------------------------------------------------------- */
/*                                 Responses                                  */
/* -------------------------------------------------------------------------- */

function denySession(reply: FastifyReply): FastifyReply {
	return deny(reply, {
		code: "UNAUTHORIZED",
		message: "A dashboard session is required to delete a voice.",
		errors: {
			session: "Sign in to the dashboard and retry.",
		},
	});
}

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

/**
 * The session-only voice library.
 *
 * The route bypasses the API-key guard (`authGuard: false`), resolves the
 * Better Auth session itself and is hidden from the public OpenAPI document;
 * the dashboard is the only intended caller. Ownership is the service's
 * concern: it scopes the lookup by the session user, so a foreign voice and a
 * missing one both raise `VoiceNotFoundError` (mapped to 404).
 *
 * `@fastify/autoload` registers the files in `src/routes/` without a prefix
 * (only subdirectories get one), so the path carries the `/voices` prefix.
 */
const voicesRoutes: FastifyPluginAsync = async (
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
		method: "DELETE",
		url: "/voices/:voice_id",
		config: { authGuard: false },
		preHandler: requireSession,
		schema: {
			hide: true,
			params: deleteVoiceParamsSchema,
			response: { 200: deleteVoiceResponseSchema },
		},
		handler: async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return denySession(reply);
			}

			// Upstream first, then the tombstone. A foreign or missing voice
			// raises `VoiceNotFoundError` before anything is deleted.
			await fastify.voiceService.remove({
				userId,
				providerResourceId: request.params.voice_id,
			});

			return { deleted: true };
		},
	});
};

export default voicesRoutes;
