import { imageRestoration, imageRestorationSchema } from "@itsrose/mtxx";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/image_restoration",
		schema: {
			tags: ["Mtxx"],
			summary: "Image Restoration",
			description: "Image Quality Restoration.",
			body: imageRestorationSchema.request,
			response: {
				200: imageRestorationSchema.response,
			},
		},
		handler: async (request) => {
			const response = await imageRestoration(request.body);
			return response;
		},
	});
};

export default route;
