import { getContent, getContentSchema } from "@itsrose/tiktok";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/get_content",
		schema: {
			tags: ["Tiktok", "Downloader"],
			summary: "Get Tiktok Content",
			description: "Get tiktok content details",
			querystring: getContentSchema.request,
			response: {
				200: getContentSchema.response,
			},
		},
		handler: async (request) => {
			const response = await getContent(request.query);
			return response;
		},
	});
};

export default route;
