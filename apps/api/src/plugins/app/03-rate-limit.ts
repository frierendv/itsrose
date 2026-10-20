import { CACHE_NAMESPACE } from "@/lib/cache";
import {
	fastifyRateLimit,
	type RateLimitPluginOptions,
} from "@fastify/rate-limit";
import { FailureResponse } from "@itsrose/api-response";
import fp from "fastify-plugin";

const rateLimitOptions = {
	hook: "preValidation",
	max: (request) => {
		if (request.apikey?.rateLimitEnabled) {
			return request.apikey?.rateLimitMax ?? 10;
		}
		return request.rateLimit?.max ?? 10;
	},
	timeWindow: (request) => {
		if (request.apikey?.rateLimitEnabled) {
			return request.apikey?.rateLimitTimeWindow ?? 60_000;
		}
		return request.rateLimit?.timeWindow ?? 60_000;
	},
	keyGenerator: (request) => request.apikey?.id || request.ip,
	addHeaders: {
		"x-ratelimit-limit": true,
		"x-ratelimit-remaining": true,
		"x-ratelimit-reset": true,
		"retry-after": true,
	},

	errorResponseBuilder: (_, context) => {
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
} satisfies RateLimitPluginOptions;

export default fp(
	async (fastify) => {
		void fastify.register(fastifyRateLimit, {
			...rateLimitOptions,

			redis: fastify.redis,
			nameSpace: `${CACHE_NAMESPACE}:api-key:rate-limit:by-id:`,
		});
	},
	{ dependencies: ["auth-guard", "redis-storage"] }
);
