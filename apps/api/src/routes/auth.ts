import { toNodeHandler } from "better-auth/node";
import type { FastifyPluginAsync } from "fastify";

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
	const handler = toNodeHandler(fastify.auth);

	void fastify.route({
		url: "/auth/*",
		method: ["GET", "POST"],
		schema: { hide: true },
		config: {
			authGuard: false,
			rateLimit: false,
		},
		validatorCompiler: () => (data) => ({ value: data }),
		serializerCompiler: () => (data) => JSON.stringify(data),
		handler: async (request, reply) => {
			if (request.body) {
				Object.assign(request.raw, { body: request.body });
			}
			for (const [key, value] of Object.entries(reply.getHeaders())) {
				if (value !== undefined) {
					void reply.raw.setHeader(key, value);
				}
			}
			await handler(request.raw, reply.raw);
			void reply.hijack();
		},
		errorHandler: async (error, request, reply) => {
			void request.log.error(error);

			return void reply.status(500).send({
				error: "Internal authentication error",
				code: "AUTH_FAILURE",
			});
		},
	});
};
export default routes;
