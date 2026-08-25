import {
	AUTH_ERRORS,
	deny,
	extractBearerToken,
	parseJson,
	type SubscriptionAccess,
} from "@/lib/auth";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import type { ApiKey } from "@itsrose/auth";
import type { RateLimitOption } from "@itsrose/auth/product";
import { resolveRateLimit } from "@itsrose/auth/product";
import { defaultKeyHasher } from "@itsrose/auth/server";
import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

export default fp(
	async (fastify) => {
		void fastify.decorateRequest("apikey", null);
		void fastify.decorateRequest("subscription", null);
		void fastify.decorateRequest("rateLimit", null);

		void fastify.addHook(
			"preValidation",
			async (request: FastifyRequest, reply: FastifyReply) => {
				const disableAuth =
					request.routeOptions.config.disableAuth ?? false;
				if (disableAuth || request.url.startsWith("/docs")) {
					return;
				}

				const plainToken = extractBearerToken(
					request.headers.authorization
				);
				if (!plainToken) {
					return deny(reply, AUTH_ERRORS.MISSING_TOKEN);
				}

				const hashedToken = await defaultKeyHasher(plainToken);

				// Step 1 -> Redis fast-path cache check for API key
				const tokenCache = await fastify.redis
					.pipeline()
					.get(CACHE_KEYS.badToken(hashedToken))
					.get(CACHE_KEYS.disabled(hashedToken))
					.get(CACHE_KEYS.apiKey(hashedToken))
					.exec();

				const [badTokenRes, disabledTokenRes, apiKeyRes] =
					tokenCache ?? [];

				if (badTokenRes && !badTokenRes[0] && badTokenRes[1]) {
					return deny(reply, AUTH_ERRORS.INVALID_KEY);
				}

				if (
					disabledTokenRes &&
					!disabledTokenRes[0] &&
					disabledTokenRes[1]
				) {
					return deny(reply, AUTH_ERRORS.DISABLED_KEY);
				}

				let apiKey =
					apiKeyRes && !apiKeyRes[0]
						? parseJson<ApiKey>(apiKeyRes[1] as string)
						: null;

				if (!apiKey) {
					const fromBetterAuth =
						await fastify.apikey.verify(plainToken);
					if (!fromBetterAuth || !fromBetterAuth.key) {
						await fastify.redis.setex(
							CACHE_KEYS.badToken(hashedToken),
							CACHE_TTL.BAD_TOKEN,
							"1"
						);
						return deny(reply, AUTH_ERRORS.INVALID_KEY);
					}

					const verifiedKey = fromBetterAuth.key as ApiKey;

					if (!verifiedKey.enabled) {
						await fastify.redis.setex(
							CACHE_KEYS.disabled(hashedToken),
							CACHE_TTL.DISABLED_TOKEN,
							"1"
						);
						return deny(reply, AUTH_ERRORS.DISABLED_KEY);
					}

					await fastify.redis.setex(
						CACHE_KEYS.apiKey(hashedToken),
						CACHE_TTL.API_KEY,
						JSON.stringify(verifiedKey)
					);

					apiKey = verifiedKey;
				}

				request.apikey = apiKey;

				// Step 2 -> Subscription verification (cached separately to preserve Better-Auth apiKey format)
				const userId = apiKey.referenceId;
				const cachedSub = await fastify.redis.get(
					CACHE_KEYS.subscriptionAccess(userId)
				);

				let subAccess = parseJson<SubscriptionAccess>(cachedSub);

				if (!subAccess) {
					const fromDatabase = await fastify.subscription.get(userId);

					await fastify.redis.setex(
						CACHE_KEYS.subscriptionAccess(userId),
						fromDatabase.hasAccess
							? CACHE_TTL.SUBSCRIPTION
							: CACHE_TTL.BAD_SUBSCRIPTION,
						JSON.stringify(fromDatabase)
					);
					subAccess = fromDatabase;
				}

				const subscription = subAccess.hasAccess ? subAccess : null;
				request.subscription = subscription;
				request.rateLimit = resolveRateLimit(
					subAccess.productId,
					subAccess.hasAccess
				);
			}
		);
	},
	{
		name: "auth-guard",
		dependencies: ["auth", "redis-storage", "creem"],
		decorators: { fastify: ["redis", "apikey", "subscription"] },
	}
);

declare module "fastify" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface FastifyRequest {
		apikey: ApiKey | null;
		subscription: SubscriptionAccess | null;
		rateLimit: RateLimitOption | null;
	}
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface FastifyContextConfig {
		disableAuth?: boolean;
	}
}
