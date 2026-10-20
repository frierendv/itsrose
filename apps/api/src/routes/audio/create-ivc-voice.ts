import { createIVCVoice, createIVCVoiceSchema } from "@itsrose/elevenlabs";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/create_clone_voice",
		schema: {
			tags: ["Audio"],
			summary: "Create Clone Voice",
			description: "Create a voice clone",
			consumes: ["multipart/form-data"],
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
		handler: async (request) => {
			const { files, ...options } = request.body;

			const response = await createIVCVoice(
				Array.isArray(files) ? files : [files],
				options
			);
			return response;
		},
	});
};

export default route;
