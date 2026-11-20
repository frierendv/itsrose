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
			const voiceAccess = options.voiceAccess;
			// Without the ownership port the upstream list passes through
			// unchanged: the internal app has no owner ledger and keeps the
			// pre-ownership behaviour.
			if (!voiceAccess) {
				return getVoices(request.query);
			}

			// The port builds the caller's whole library from its own cached,
			// fully-paginated catalogue: the caller's clones plus the premade
			// voices. `page_size` and `next_page_token` are accepted by the
			// schema but ignored - filtering after one upstream page would
			// return an incomplete library and incoherent page metadata - and
			// the response is the whole filtered library with `has_more:
			// false`.
			return voiceAccess.listVisibleVoices(request, request.query);
		},
	});
};
