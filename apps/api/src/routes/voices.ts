import { createSessionGuard } from "@/lib/session";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
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
	const session = createSessionGuard(
		fastify.auth,
		"A dashboard session is required to delete a voice."
	);

	const routes = fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>();

	routes.route({
		method: "DELETE",
		url: "/voices/:voice_id",
		config: { authGuard: false },
		preHandler: session.preHandler,
		schema: {
			hide: true,
			params: deleteVoiceParamsSchema,
			response: { 200: deleteVoiceResponseSchema },
		},
		handler: async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return session.deny(reply);
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
