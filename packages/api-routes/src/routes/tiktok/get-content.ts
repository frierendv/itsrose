import { getContent, getContentSchema } from "@itsrose/tiktok";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import type { SharedRoutesOptions } from "../../options";

const DESCRIPTION = "Get tiktok content details";

/**
 * Registers `GET /get_content`.
 */
export const registerGetContentRoute = (
	fastify: FastifyInstance,
	options: SharedRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/get_content",
		schema: {
			tags: ["Tiktok", "Downloader"],
			summary: "Get Tiktok Content",
			description: options.descriptions?.getContent ?? DESCRIPTION,
			querystring: getContentSchema.request,
			response: {
				200: getContentSchema.response,
			},
		},
		handler: async (request) => {
			const response = await getContent(request.query);
			return response;
		},
	});
};
