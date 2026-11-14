import { imageRestoration, imageRestorationSchema } from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { MtxxRoutesOptions } from "../options";

const DESCRIPTION = "Image Quality Restoration.";

/**
 * Registers `POST /image_restoration` under the prefix of the module.
 */
export const registerImageRestorationRoute = (
	fastify: FastifyInstance,
	options: MtxxRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: joinUrl(prefix, "/image_restoration"),
		schema: {
			tags: ["Mtxx"],
			summary: "Image Restoration",
			description: options.descriptions?.imageRestoration ?? DESCRIPTION,
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
