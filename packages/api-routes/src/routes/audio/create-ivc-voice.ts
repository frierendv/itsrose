import { createIVCVoice, createIVCVoiceSchema } from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import type { SharedRoutesOptions } from "../../options";

const DESCRIPTION = "Create a voice clone";

/**
 * Registers `POST /create_clone_voice`.
 */
export const registerCreateIvcVoiceRoute = (
	fastify: FastifyInstance,
	options: SharedRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/create_clone_voice",
		schema: {
			tags: ["Audio"],
			summary: "Create Clone Voice",
			description: options.descriptions?.createIvcVoice ?? DESCRIPTION,
			consumes: options.consumes?.createIvcVoice ?? ["application/json"],
			body: createIVCVoiceSchema.request,
			response: {
				200: createIVCVoiceSchema.response,
			},
		},
		config: {
			multipartOptions: {
				limits: {
					files: 2, // Limit the number of files to 10
					fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
				},
			},
		},
		handler: async (request) => createIVCVoice(request.body),
	});
};
