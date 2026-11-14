import { createTask, createTaskSchema } from "@itsrose/remini";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import type { SharedRoutesOptions } from "../../options";

const DESCRIPTION = "Create remini image enhance task";

/**
 * Registers `POST /create_task`.
 */
export const registerCreateTaskRoute = (
	fastify: FastifyInstance,
	options: SharedRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/create_task",
		schema: {
			tags: ["Remini"],
			summary: "Create Task",
			description: options.descriptions?.createTask ?? DESCRIPTION,
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
