import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { z } from "zod/v4";
import { VoiceAccessUnavailableError } from "../options";
import type { AudioRoutesOptions } from "../options";

const DESCRIPTION = "Delete a voice the caller owns";

/**
 * The path parameter of the delete route.
 *
 * The voice id is the upstream id: the ownership ledger records it and the
 * provider delete needs it, so the route addresses the same object the caller
 * got from `create_clone_voice` or `get_voices`.
 */
const deleteVoiceParamsSchema = z.object({
	voice_id: z.string().min(1).describe("The id of the voice to delete."),
});

const deleteVoiceResponseSchema = z.object({
	deleted: z.literal(true).describe("Whether the voice was deleted."),
});

/**
 * Registers `DELETE /voices/:voice_id`.
 *
 * The caller's ownership is the grant: the host port resolves the voice
 * against the ledger, deletes it upstream and tombstones the row, and refuses
 * a voice the caller does not own with the same error a missing voice raises.
 */
export const registerDeleteVoiceRoute = (
	fastify: FastifyInstance,
	options: AudioRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "DELETE",
		url: "/voices/:voice_id",
		schema: {
			tags: ["Audio"],
			summary: "Delete Voice",
			description: DESCRIPTION,
			params: deleteVoiceParamsSchema,
			response: {
				200: deleteVoiceResponseSchema,
			},
		},
		handler: async (request) => {
			const voiceAccess = options.voiceAccess;
			if (!voiceAccess) {
				throw new VoiceAccessUnavailableError(
					"Deleting a voice requires the voice ownership port, which this deployment does not configure."
				);
			}

			await voiceAccess.deleteOwnedVoice(
				request,
				request.params.voice_id
			);

			return { deleted: true } as const;
		},
	});
};
