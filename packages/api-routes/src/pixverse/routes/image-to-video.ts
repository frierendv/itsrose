import { createImageToVideo, imageToVideoSchema } from "@itsrose/pixverse";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const DESCRIPTION =
	"Create a video from an uploaded image, or from a template.";

/**
 * Registers `POST /image_to_video`.
 */
export const registerImageToVideoRoute = (fastify: FastifyInstance): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/image_to_video",
		schema: {
			tags: ["Pixverse"],
			summary: "Image to Video",
			description: DESCRIPTION,
			body: imageToVideoSchema.request,
			response: {
				200: imageToVideoSchema.response,
			},
		},
		handler: async (request) => {
			const response = await createImageToVideo(request.body);
			return response;
		},
	});
};
