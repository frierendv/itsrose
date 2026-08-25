import {
	fastifyRateLimit,
	type RateLimitPluginOptions,
} from "@fastify/rate-limit";
import { FailureResponse } from "@itsrose/api-response";
import fp from "fastify-plugin";

export default fp(async (fastify) => {
	const config: RateLimitPluginOptions = {
		hook: "preValidation",
		max: (request) => request.rateLimit?.max ?? 10,
		timeWindow: (request) => request.rateLimit?.timeWindow ?? 60_000,
		keyGenerator: (request) => request.apikey?.id || request.ip,
		addHeaders: {
			"x-ratelimit-limit": true,
			"x-ratelimit-remaining": true,
			"x-ratelimit-reset": true,
			"retry-after": true,
		},

		errorResponseBuilder: (req, context) => {
			return FailureResponse.create({
				code: "RATE_LIMITED",
				message: `You have exceeded the rate limit. Please try again after ${context.after}.`,
				meta: {
					is_banned: context.ban,
					limit: context.max,
					retry_after: context.after,
				},
				errors: {
					type: "RATE_LIMITED",
				},
			});
		},

		redis: fastify.redis,
		nameSpace: "api:api-key:rate-limit:by-id:",
	};
	void fastify.register(fastifyRateLimit, config);
});
