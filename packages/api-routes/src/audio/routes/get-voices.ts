import { getVoices, getVoicesSchema } from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import type { AudioRoutesOptions } from "../options";

const DESCRIPTION = "Get available voices";

/**
 * Registers `GET /get_voices`.
 */
export const registerGetVoicesRoute = (
	fastify: FastifyInstance,
	options: AudioRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/get_voices",
		schema: {
			tags: ["Audio"],
			summary: "Get Voices",
			description: DESCRIPTION,
			querystring: getVoicesSchema.request,
			response: {
				200: getVoicesSchema.response,
			},
		},
		handler: async (request) => {
			const response = await getVoices(request.query);

			const voiceAccess = options.voiceAccess;
			// Without the ownership port the upstream list passes through
			// unchanged: the internal app has no owner ledger and keeps the
			// pre-ownership behaviour.
			if (!voiceAccess) {
				return response;
			}

			// The caller sees the clones it owns plus the platform's premade
			// catalogue. Another user's clone is neither: its upstream
			// `category` is `cloned` and it has no ledger row pointing at the
			// caller, so the filter drops it.
			const owned = new Set(await voiceAccess.listOwnedVoiceIds(request));
			response.voices = response.voices.filter(
				(voice) =>
					owned.has(voice.voice_id) || voice.category === "premade"
			);

			return response;
		},
	});
};
