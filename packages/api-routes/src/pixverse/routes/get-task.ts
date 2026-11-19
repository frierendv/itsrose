import { getTask, getTaskSchema } from "@itsrose/pixverse";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { PixverseRoutesOptions } from "../options";

const DESCRIPTION = "Query a video generation task";

/**
 * Registers `GET /get_task` under the prefix of the module.
 */
export const registerGetTaskRoute = (
	fastify: FastifyInstance,
	options: PixverseRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: joinUrl(prefix, "/get_task"),
		config: {
			// Polling is free: it never consumes plan quota, but it stays
			// bounded so one key cannot hammer the upstream.
			billable: false,
			rateLimit: { max: 600, timeWindow: 60_000 },
		},
		schema: {
			tags: ["Pixverse"],
			summary: "Get task",
			description: options.descriptions?.getTask ?? DESCRIPTION,
			querystring: getTaskSchema.request,
			response: {
				200: getTaskSchema.response,
			},
		},
		handler: async (request) => {
			const response = await getTask(request.query);
			return response;
		},
	});
};
