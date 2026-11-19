import { imageRestoration, imageRestorationSchema } from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const DESCRIPTION = "Image Quality Restoration.";

/**
 * Registers `POST /image_restoration`.
 */
export const registerImageRestorationRoute = (
	fastify: FastifyInstance
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/image_restoration",
		schema: {
			tags: ["Mtxx"],
			summary: "Image Restoration",
			description: DESCRIPTION,
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
