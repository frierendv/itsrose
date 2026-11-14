import { versatileHairstyle, versatileHairstyleSchema } from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import type { SharedRoutesOptions } from "../../options";

const DESCRIPTION =
	"Versatile Hairstyle is a hairstyle that can be adapted to different occasions and styles.";

/**
 * Registers `POST /versatile_hairstyle`.
 */
export const registerVersatileHairstyleRoute = (
	fastify: FastifyInstance,
	options: SharedRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/versatile_hairstyle",
		schema: {
			tags: ["Mtxx"],
			summary: "Versatile Hairstyle",
			description:
				options.descriptions?.versatileHairstyle ?? DESCRIPTION,
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
