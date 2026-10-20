import fp from "fastify-plugin";

const fastifyRequestTracker = fp(
	async (fastify) => {
		// Hook: runs before route handler
		void fastify.addHook("onRequest", async (request) => {
			void request.log.info({
				event: "request_start",
				method: request.method,
				url: request.url,
				userAgent: request.headers["user-agent"],
				userId: request.userId,
				ip: request.ip,
			});
		});

		// Hook: runs after response is sent
		void fastify.addHook("onResponse", async (request, reply) => {
			void request.log.info({
				event: "request_end",
				method: request.method,
				url: request.url,
				durationMs: reply.elapsedTime,
				userId: request.userId,
			});
		});

		// Always return the request ID in response
		void fastify.addHook("onSend", async (request, reply) => {
			void reply.header("x-connecting-ip", request.ip || "unknown");
			void reply.header("x-request-id", request.id);
			void reply.header("x-response-time", reply.elapsedTime.toFixed(2));
		});
	},
	{ dependencies: ["redis-storage", "auth"] }
);

export default fastifyRequestTracker;
