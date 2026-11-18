import { createTextToVideo, textToVideoSchema } from "@itsrose/pixverse";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { PixverseRoutesOptions } from "../options";

const DESCRIPTION = "Create a video from a text prompt.";

/**
 * Registers `POST /text_to_video` under the prefix of the module.
 */
export const registerTextToVideoRoute = (
	fastify: FastifyInstance,
	options: PixverseRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: joinUrl(prefix, "/text_to_video"),
		schema: {
			tags: ["Pixverse"],
			summary: "Text to Video",
			description: options.descriptions?.textToVideo ?? DESCRIPTION,
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
