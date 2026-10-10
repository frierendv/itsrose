import { getMedia, getMediaSchema } from "@itsrose/instagram";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/get_media",
		schema: {
			tags: ["Instagram", "Downloader"],
			summary: "Get Instagram Media",
			description: "Get Instagram media details",
			querystring: getMediaSchema.request,
			response: { 200: getMediaSchema.response },
		},
		handler: async (request) => {
			const response = await getMedia(request.query);
			return response;
		},
	});
};
export default route;
