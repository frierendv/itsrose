import { versatileHairstyle, versatileHairstyleSchema } from "@itsrose/mtxx";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/versatile_hairstyle",
		schema: {
			tags: ["Mtxx"],
			summary: "Versatile Hairstyle",
			description:
				"Versatile Hairstyle is a hairstyle that can be adapted to different occasions and styles.",
			body: versatileHairstyleSchema.request,
			response: {
				200: versatileHairstyleSchema.response,
			},
		},
		handler: async (request) => {
			const response = await versatileHairstyle(request.body);
			return response;
		},
	});
};

export default route;
