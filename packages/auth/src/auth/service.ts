import { apiKey } from "@better-auth/api-key";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { authOptions } from "./server";

export const betterAuthServicePlugins = [
	apiKey({
		configId: "secret",
		defaultPrefix: "sk_",
		references: "user",
		rateLimit: { enabled: false },
		requireName: true,
		storage: "secondary-storage",
		fallbackToDatabase: true,
		enableMetadata: true,
		schema: {
			apikey: {
				modelName: "apikeys",
				fields: {
					configId: "config_id",
					// since the key is hashed, remap it to `hash`
					key: "hashed_key",
					/* Ref to user id */
					referenceId: "reference_id",
					requestCount: "request_count",
					rateLimitEnabled: "rate_limit_enabled",
					rateLimitTimeWindow: "rate_limit_time_window",
					rateLimitMax: "rate_limit_max",
					refillAmount: "refill_amount",
					refillInterval: "refill_interval",
					lastRefillAt: "last_refill_at",
					lastRequest: "last_request",
					expiresAt: "expires_at",
					createdAt: "created_at",
					updatedAt: "updated_at",
				},
			},
		},
	}),
];

export const createAuthService = (overrides: BetterAuthOptions = {}) => {
	return betterAuth({
		...authOptions,
		...overrides,
		plugins: [...betterAuthServicePlugins],
	});
};
