import { outpainting, outpaintingSchema } from "@itsrose/mtxx";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/outpainting",
		schema: {
			tags: ["Mtxx"],
			summary: "Outpainting",
			description:
				"Extends an image beyond its original canvas using AI outpainting.",
			body: outpaintingSchema.request,
			response: {
				200: outpaintingSchema.response,
			},
		},
		handler: async (request) => {
			const response = await outpainting(request.body);
			return response;
		},
	});
};

export default route;
