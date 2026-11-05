import { createUsageCounter } from "@/lib/usage";
import {
	normalizeEndpoint,
	statusClassOf,
	tenantIdForUser,
} from "@itsrose/auth-usage/server";
import fp from "fastify-plugin";

export default fp(
	async (fastify) => {
		const counter = createUsageCounter(fastify);

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

			const userId = request.userId;
			if (!userId) {
				return;
			}

			// Fire-and-forget: metering must never affect the response.
			void counter
				.record({
					tenant_id: tenantIdForUser(userId),
					user_id: userId,
					api_key_id: request.apikey?.id ?? null,
					// Route template only: raw URLs carry ids and secrets and
					// would shatter the dimension.
					endpoint: normalizeEndpoint({
						route_url: request.routeOptions?.url,
						url: request.url,
					}),
					status_class: statusClassOf(reply.statusCode),
					latency_ms: reply.elapsedTime,
				})
				.catch((err: unknown) => {
					fastify.log.warn(
						{ err, userId },
						"Failed to record usage counters"
					);
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
