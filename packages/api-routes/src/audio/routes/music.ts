import {
	ElevenLabsSharedResponseAudioSchema,
	musicCompose,
	musicComposePlan,
	musicComposePlanSchema,
	musicComposeSchema,
} from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import { withAudioResponseHeader } from "../../schema";
import type { AudioRoutesOptions } from "../options";
import { uploadAudio, uploadUnlessBase64 } from "../upload";

const COMPOSE_DESCRIPTION =
	"Compose a song from a prompt or a composition plan.";
const PLAN_DESCRIPTION = "Create a composition plan for music generation.";

/**
 * Registers `POST /music_compose` and `POST /music_compose_plan` under the
 * prefix of the module.
 */
export const registerMusicRoutes = (
	fastify: FastifyInstance,
	options: AudioRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: joinUrl(prefix, "/music_compose"),
		schema: withAudioResponseHeader(
			{
				tags: ["Audio"],
				summary: "Music compose",
				description:
					options.descriptions?.musicCompose ?? COMPOSE_DESCRIPTION,
				consumes: options.consumes?.musicCompose ?? [
					"application/json",
				],
				body: musicComposeSchema.request,
				headers: ElevenLabsSharedResponseAudioSchema,
				response: {
					200: musicComposeSchema.response,
				},
			},
			options.declareAudioResponseHeader
		),
		handler: async (request) => {
			const response = await musicCompose(request.body);
			response.audio = await uploadAudio(
				request,
				response.audio,
				request.headers["response-audio-format"],
				uploadUnlessBase64,
				options
			);
			return response;
		},
	});
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: joinUrl(prefix, "/music_compose_plan"),
		schema: {
			tags: ["Audio"],
			summary: "Music composition plan",
			description:
				options.descriptions?.musicComposePlan ?? PLAN_DESCRIPTION,
			consumes: options.consumes?.musicComposePlan ?? [
				"application/json",
			],
			body: musicComposePlanSchema.request,
			response: {
				200: musicComposePlanSchema.response,
			},
		},
		handler: async (request) => musicComposePlan(request.body),
	});
};
