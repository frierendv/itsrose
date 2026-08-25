import { toNodeHandler } from "better-auth/node";
import type { FastifyPluginAsync } from "fastify";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	const handler = toNodeHandler(fastify.auth);

	void fastify.route({
		url: "/*",
		method: ["GET", "POST"],
		handler: async (request, reply) => {
			if (request.body) {
				Object.assign(request.raw, { body: request.body });
			}
			for (const [key, value] of Object.entries(reply.getHeaders())) {
				if (value !== undefined) {
					reply.raw.setHeader(key, value);
				}
			}
			await handler(request.raw, reply.raw);
			reply.hijack();
		},
		errorHandler: async (error, request, reply) => {
			void fastify.log.error(error);

			return reply.status(500).send({
				error: "Internal authentication error",
				code: "AUTH_FAILURE",
			});
		},
	});
};

export default route;
