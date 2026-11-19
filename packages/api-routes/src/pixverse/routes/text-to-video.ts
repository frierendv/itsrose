import { createTextToVideo, textToVideoSchema } from "@itsrose/pixverse";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const DESCRIPTION = "Create a video from a text prompt.";

/**
 * Registers `POST /text_to_video`.
 */
export const registerTextToVideoRoute = (fastify: FastifyInstance): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/text_to_video",
		schema: {
			tags: ["Pixverse"],
			summary: "Text to Video",
			description: DESCRIPTION,
			body: textToVideoSchema.request,
			response: {
				200: textToVideoSchema.response,
			},
		},
		handler: async (request) => {
			const response = await createTextToVideo(request.body);
			return response;
		},
	});
};
