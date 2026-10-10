import { removeBg, removeBgSchema } from "@itsrose/mtxx";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/remove_bg",
		schema: {
			tags: ["Mtxx"],
			summary: "Remove BG",
			description: "Remove background from an image.",
			body: removeBgSchema.request,
			response: {
				200: removeBgSchema.response,
			},
		},
		handler: async (request) => {
			const response = await removeBg(request.body);
			return response;
		},
	});
};

export default route;
