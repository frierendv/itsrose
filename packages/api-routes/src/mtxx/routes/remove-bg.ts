import { removeBg, removeBgSchema } from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const DESCRIPTION = "Remove background from an image.";

/**
 * Registers `POST /remove_bg`.
 */
export const registerRemoveBgRoute = (fastify: FastifyInstance): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/remove_bg",
		schema: {
			tags: ["Mtxx"],
			summary: "Remove BG",
			description: DESCRIPTION,
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
