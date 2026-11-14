import { SuccessResponse } from "@itsrose/api-response";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { z } from "zod/v4";

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/hooks",
		config: { authGuard: false, rateLimit: false },
		schema: {
			tags: ["General"],
			description: "Receive a webhook from an external service",
			/**
			 * The webhook payload.
			 *
			 * The external service decides the shape of the body, so the
			 * payload is a free-form map of unknown values: the route hands it
			 * to the consumer, which is the place that knows what it means.
			 */
			body: z.record(z.string(), z.unknown()).describe("Webhook payload"),
			response: {
				200: z.object({ ok: z.boolean() }).describe("Empty response"),
			},
		},
		handler: async (request) => {
			const payload = request.body;

			// consume body
			void payload;
			// ...end

			const response = SuccessResponse.create({
				code: "PARTIAL_SUCCESS",
				data: { ok: true },
				meta: { request_id: request.id },
			});
			return response;
		},
	});
};
export default routes;
