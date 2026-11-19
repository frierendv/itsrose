import { getTask, getTaskSchema } from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { MtxxRoutesOptions } from "../options";

const DESCRIPTION = "Query sync task";

/**
 * Registers `GET /get_task` under the prefix of the module.
 */
export const registerGetTaskRoute = (
	fastify: FastifyInstance,
	options: MtxxRoutesOptions,
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
			tags: ["Mtxx"],
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
