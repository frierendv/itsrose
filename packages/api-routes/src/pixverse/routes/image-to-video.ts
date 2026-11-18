import { createImageToVideo, imageToVideoSchema } from "@itsrose/pixverse";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { PixverseRoutesOptions } from "../options";

const DESCRIPTION =
	"Create a video from an uploaded image, or from a template.";

/**
 * Registers `POST /image_to_video` under the prefix of the module.
 */
export const registerImageToVideoRoute = (
	fastify: FastifyInstance,
	options: PixverseRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: joinUrl(prefix, "/image_to_video"),
		schema: {
			tags: ["Pixverse"],
			summary: "Image to Video",
			description: options.descriptions?.imageToVideo ?? DESCRIPTION,
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
