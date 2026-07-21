import { createTask, createTaskSchema } from "@itsrose/remini";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/create_task",
		schema: {
			tags: ["Remini"],
			summary: "Create Task",
			description: "Create remini image enhance task",
			body: createTaskSchema.request,
			response: {
				200: createTaskSchema.response,
			},
		},
		handler: async (request) => {
			const response = await createTask(request.body);
			return response;
		},
	});
};

export default route;
