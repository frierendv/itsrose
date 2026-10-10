import {
	musicCompose,
	musicComposePlan,
	musicComposePlanSchema,
	musicComposeSchema,
} from "@itsrose/elevenlabs";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/music_compose",
		schema: {
			tags: ["Audio"],
			summary: "Music compose",
			description: "Compose a song from a prompt or a composition plan.",
			consumes: ["application/json"],
			body: musicComposeSchema.request,
			response: {
				200: musicComposeSchema.response,
			},
		},
		handler: async (request) => {
			const response = await musicCompose(request.body);
			return response;
		},
	});
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/music_compose_plan",
		schema: {
			tags: ["Audio"],
			summary: "Music composition plan",
			description: "Create a composition plan for music generation.",
			consumes: ["application/json"],
			body: musicComposePlanSchema.request,
			response: {
				200: musicComposePlanSchema.response,
			},
		},
		handler: async (request) => musicComposePlan(request.body),
	});
};
export default route;
