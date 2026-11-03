import { AUTH_ERRORS, deny, extractBearerToken, parseJson } from "@/lib/auth";
import { CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import type { ApiKey } from "@itsrose/auth";
import { type PlanLimits, type UserSubscription } from "@itsrose/auth-billing";
import { defaultKeyHasher } from "@itsrose/auth/server";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

type ApiKeyResult =
	| { success: true; apiKey: ApiKey }
	| {
			success: false;
			error:
				| typeof AUTH_ERRORS.INVALID_KEY
				| typeof AUTH_ERRORS.DISABLED_KEY;
	  };

/**
 * Validates an API key against Redis multi-layer cache or Better Auth DB adapter.
 * Handles negative caching for invalid/disabled keys and active caching for verified keys.
 */
async function findApikey(
	fastify: FastifyInstance,
	plainToken: string
): Promise<ApiKeyResult> {
	const hashedToken = await defaultKeyHasher(plainToken);

	try {
		const tokenCache = await fastify.redis
			.pipeline()
			.get(CACHE_KEYS.badToken(hashedToken))
			.get(CACHE_KEYS.disabled(hashedToken))
			.get(CACHE_KEYS.apiKey(hashedToken))
			.exec();

		const [badTokenRes, disabledTokenRes, apiKeyRes] = tokenCache ?? [];

		if (badTokenRes && !badTokenRes[0] && badTokenRes[1]) {
			return { success: false, error: AUTH_ERRORS.INVALID_KEY };
		}

		if (disabledTokenRes && !disabledTokenRes[0] && disabledTokenRes[1]) {
			return { success: false, error: AUTH_ERRORS.DISABLED_KEY };
		}

		if (apiKeyRes && !apiKeyRes[0] && apiKeyRes[1]) {
			const apiKey = parseJson<ApiKey>(apiKeyRes[1] as string);
			if (apiKey) {
				return { success: true, apiKey };
			}
		}
	} catch (err) {
		fastify.log.warn({ err }, "Redis error checking API key cache");
	}

	try {
		const fromBetterAuth = await fastify.auth.api.verifyApiKey({
			body: { key: plainToken },
		});

		const isValid = Boolean(
			fromBetterAuth && fromBetterAuth.valid && fromBetterAuth.key
		);

		if (!isValid) {
			const isExplicitlyDisabled = Boolean(
				fromBetterAuth?.error?.code === "API_KEY_DISABLED" ||
				(fromBetterAuth?.key && !fromBetterAuth.key.enabled)
			);

			if (isExplicitlyDisabled) {
				try {
					await fastify.redis.setex(
						CACHE_KEYS.disabled(hashedToken),
						CACHE_TTL.DISABLED_TOKEN,
						"1"
					);
				} catch (err) {
					fastify.log.warn(
						{ err },
						"Failed to write disabled token to Redis cache"
					);
				}
				return { success: false, error: AUTH_ERRORS.DISABLED_KEY };
			}

			try {
				await fastify.redis.setex(
					CACHE_KEYS.badToken(hashedToken),
					CACHE_TTL.BAD_TOKEN,
					"1"
				);
			} catch (err) {
				fastify.log.warn(
					{ err },
					"Failed to write bad token to Redis cache"
				);
			}
			return { success: false, error: AUTH_ERRORS.INVALID_KEY };
		}

		const verifiedKey = fromBetterAuth.key as ApiKey;

		if (!verifiedKey.enabled) {
			try {
				await fastify.redis.setex(
					CACHE_KEYS.disabled(hashedToken),
					CACHE_TTL.DISABLED_TOKEN,
					"1"
				);
			} catch (err) {
				fastify.log.warn(
					{ err },
					"Failed to write disabled token to Redis cache"
				);
			}
			return { success: false, error: AUTH_ERRORS.DISABLED_KEY };
		}

		try {
			await fastify.redis.setex(
				CACHE_KEYS.apiKey(hashedToken),
				CACHE_TTL.API_KEY,
				JSON.stringify(verifiedKey)
			);
		} catch (err) {
			fastify.log.warn({ err }, "Failed to write API key to Redis cache");
		}

		return { success: true, apiKey: verifiedKey };
	} catch (err) {
		fastify.log.error({ err }, "Error verifying API key with Better Auth");
		return { success: false, error: AUTH_ERRORS.INVALID_KEY };
	}
}

/**
 * Resolves user subscription access from Redis cache or ItsRose subscription resolver.
 */
async function findSubscription(
	fastify: FastifyInstance,
	userId: string
): Promise<UserSubscription> {
	const cacheKey = CACHE_KEYS.subscriptionAccess(userId);

	try {
		const cachedSub = await fastify.redis.get(cacheKey);
		if (cachedSub) {
			const subAccess = parseJson<UserSubscription>(cachedSub);
			if (subAccess) {
				return subAccess;
			}
		}
	} catch (err) {
		fastify.log.warn(
			{ err, userId },
			"Failed to read subscription from Redis cache"
		);
	}

	const sub = await fastify.subscription.get(userId);

	try {
		const pipeline = fastify.redis.pipeline();
		pipeline.setex(
			cacheKey,
			sub.has_access
				? CACHE_TTL.SUBSCRIPTION
				: CACHE_TTL.BAD_SUBSCRIPTION,
			JSON.stringify(sub)
		);
		if (!sub.has_access) {
			pipeline.setex(
				CACHE_KEYS.badSubscription(userId),
				CACHE_TTL.BAD_SUBSCRIPTION,
				"1"
			);
		}
		await pipeline.exec();
	} catch (err) {
		fastify.log.warn(
			{ err, userId },
			"Failed to write subscription to Redis cache"
		);
	}

	return sub;
}

export default fp(
	async (fastify) => {
		void fastify.decorateRequest("userId", null);
		void fastify.decorateRequest("apikey", null);
		void fastify.decorateRequest("subscription", null);
		void fastify.decorateRequest("rateLimit", null);

		void fastify.addHook(
			"preValidation",
			async (request: FastifyRequest, reply: FastifyReply) => {
				const authGuard = request.routeOptions.config.authGuard ?? true;
				if (!authGuard || request.url.startsWith("/docs")) {
					return;
				}

				let userId: string;

				const authToken = request.headers["x-auth-token"];
				if (authToken && authToken === "true") {
					const response = await fastify.auth.api.getSession({
						headers: request.headers as unknown as Headers,
					});
					if (!response || !response.user) {
						return deny(reply, AUTH_ERRORS.INVALID_KEY);
					}
					userId = response.user.id;
				} else {
					// API Key authentication path
					const plainToken = extractBearerToken(
						request.headers.authorization
					);
					if (!plainToken) {
						return deny(reply, AUTH_ERRORS.MISSING_TOKEN);
					}

					const keyResult = await findApikey(fastify, plainToken);
					if (!keyResult.success) {
						return deny(reply, keyResult.error);
					}

					request.apikey = keyResult.apiKey;
					userId = keyResult.apiKey.referenceId;
				}

				// Resolve subscription and plan access (cached separately to preserve Better-Auth apiKey format)
				const subscription = await findSubscription(fastify, userId);
				request.subscription = subscription;
				request.rateLimit = subscription.rate_limit;
				request.userId = userId;

				// Enforce subscription if required by route configuration
				const requireSubscription =
					request.routeOptions.config.requireSubscription ?? false;
				if (requireSubscription && !subscription.has_access) {
					return deny(reply, AUTH_ERRORS.SUBSCRIPTION_REQUIRED);
				}
			}
		);
	},
	{
		name: "auth-guard",
		dependencies: ["auth", "redis-storage"],
		decorators: { fastify: ["redis", "subscription"] },
	}
);

declare module "fastify" {
	interface FastifyRequest {
		userId: string | null;
		apikey: Omit<ApiKey, "key"> | null;
		subscription: UserSubscription | null;
		rateLimit: PlanLimits | null;
	}

	interface FastifyContextConfig {
		authGuard?: boolean;
		requireSubscription?: boolean;
	}
}
