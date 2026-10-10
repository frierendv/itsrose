import { getTask, getTaskSchema } from "@itsrose/mtxx";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/get_task",
		schema: {
			tags: ["Mtxx"],
			summary: "Get task",
			description: "Query sync task",
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

export default route;
