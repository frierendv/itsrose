import fp from "fastify-plugin";

const fastifyRequestTracker = fp(
	async (fastify) => {
		// Hook: runs before route handler
		void fastify.addHook("onRequest", async (request) => {
			request.startTime = Date.now();

			void request.log.info({
				event: "request_start",
				method: request.method,
				url: request.url,
				userAgent: request.headers["user-agent"],
				ip: request.ip,
			});
		});

		// Hook: runs after response is sent
		void fastify.addHook("onResponse", async (request, reply) => {
			void request.log.info({
				event: "request_end",
				method: request.method,
				url: request.url,
				statusCode: reply.statusCode,
				durationMs: reply.elapsedTime,
				user: { reference_id: request.apikey?.referenceId },
			});
		});

		// Always return the request ID in response
		void fastify.addHook("onSend", async (request, reply) => {
			reply.header("x-request-id", request.id);
			reply.header("x-response-time", reply.elapsedTime.toFixed(2));
		});
	},
	{ dependencies: ["redis-storage", "auth"] }
);

declare module "fastify" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface FastifyRequest {
		startTime: number;
	}
}

export default fastifyRequestTracker;
