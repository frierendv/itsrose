import { removeBg, removeBgSchema } from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { MtxxRoutesOptions } from "../options";

const DESCRIPTION = "Remove background from an image.";

/**
 * Registers `POST /remove_bg` under the prefix of the module.
 */
export const registerRemoveBgRoute = (
	fastify: FastifyInstance,
	options: MtxxRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: joinUrl(prefix, "/remove_bg"),
		schema: {
			tags: ["Mtxx"],
			summary: "Remove BG",
			description: options.descriptions?.removeBg ?? DESCRIPTION,
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
