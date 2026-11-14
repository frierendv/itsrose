import { outpainting, outpaintingSchema } from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import type { SharedRoutesOptions } from "../../options";

const DESCRIPTION =
	"Extends an image beyond its original canvas using AI outpainting.";

/**
 * Registers `POST /outpainting`.
 */
export const registerOutpaintingRoute = (
	fastify: FastifyInstance,
	options: SharedRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/outpainting",
		schema: {
			tags: ["Mtxx"],
			summary: "Outpainting",
			description: options.descriptions?.outpainting ?? DESCRIPTION,
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
