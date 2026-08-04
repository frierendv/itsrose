import {
	fastifyRateLimit,
	type RateLimitPluginOptions,
} from "@fastify/rate-limit";
import { FailureResponse } from "@itsrose/api-response";

export const autoConfig: RateLimitPluginOptions = {
	max: 50,
	timeWindow: 10_000,

	errorResponseBuilder: (req, context) => {
		return new FailureResponse({
			code: "RATE_LIMITED",
			message: `You have exceeded the rate limit. Please try again after ${context.after}.`,
			meta: {
				limit: context.max,
				retry_after: context.after,
				ttl: context.ttl,
			},
			errors: {
				type: "RATE_LIMITED",
			},
		});
	},
};

export default fastifyRateLimit;
