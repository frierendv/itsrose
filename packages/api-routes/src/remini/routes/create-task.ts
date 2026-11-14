import { createTask, createTaskSchema } from "@itsrose/remini";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { ReminiRoutesOptions } from "../options";

const DESCRIPTION = "Create remini image enhance task";

/**
 * Registers `POST /create_task` under the prefix of the module.
 */
export const registerCreateTaskRoute = (
	fastify: FastifyInstance,
	options: ReminiRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: joinUrl(prefix, "/create_task"),
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
