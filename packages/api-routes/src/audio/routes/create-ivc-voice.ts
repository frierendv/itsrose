import { createIVCVoice, createIVCVoiceSchema } from "@itsrose/elevenlabs";
import { ThirdPartyApiError } from "@itsrose/system";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import type { AudioRoutesOptions } from "../options";

const DESCRIPTION = "Create a voice clone";

/**
 * Registers `POST /create_clone_voice`.
 */
export const registerCreateIvcVoiceRoute = (
	fastify: FastifyInstance,
	options: AudioRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/create_clone_voice",
		schema: {
			tags: ["Audio"],
			summary: "Create Clone Voice",
			description: DESCRIPTION,
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
			const created = await createIVCVoice(request.body);

			const voiceAccess = options.voiceAccess;
			// Without the ownership port the clone is returned as created: the
			// internal app keeps its pre-ownership behaviour.
			if (!voiceAccess) {
				return created;
			}

			try {
				await voiceAccess.recordClonedVoice(request, {
					voice_id: created.voice_id,
					name: request.body.name,
				});
			} catch (error) {
				// The upstream create already spent a voice slot. Returning
				// success would hand the caller an id it can neither list nor
				// use, so the failure is reported as an upstream failure
				// instead: the clone exists but is not registered.
				request.log.error(
					{ err: error, voice_id: created.voice_id },
					"The cloned voice was created upstream but could not be recorded against the caller."
				);
				throw new ThirdPartyApiError(
					"The voice clone was created upstream but could not be registered, so it is not available to the caller.",
					502
				);
			}

			return created;
		},
	});
};
