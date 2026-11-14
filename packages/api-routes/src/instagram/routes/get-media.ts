import { getMedia, getMediaSchema } from "@itsrose/instagram";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { InstagramRoutesOptions } from "../options";

const DESCRIPTION = "Get Instagram media details";

/**
 * Registers `GET /get_media` under the prefix of the module.
 */
export const registerGetMediaRoute = (
	fastify: FastifyInstance,
	options: InstagramRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: joinUrl(prefix, "/get_media"),
		schema: {
			tags: ["Instagram", "Downloader"],
			summary: "Get Instagram Media",
			description: options.descriptions?.getMedia ?? DESCRIPTION,
			querystring: getMediaSchema.request,
			response: { 200: getMediaSchema.response },
		},
		handler: async (request) => {
			const response = await getMedia(request.query);
			return response;
		},
	});
};
