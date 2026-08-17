import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { localization, type BuiltInLocales } from "better-auth-localization";
import {
	admin,
	bearer,
	haveIBeenPwned,
	multiSession,
	oauthPopup,
} from "better-auth/plugins";
import { COOKIE_PREFIX, WEBAUTHN_CHALLENGE_COOKIE } from "./shared/constants";
import type { SharedEnv } from "./shared/env";
// #if DEV
// prettier-ignore
import { openAPI } from "better-auth/plugins";

// #endif

/**
 * Parses Accept-Language header and returns locales sorted by quality weight.
 */
export function parseAcceptLanguage(header: string | null): string[] {
	if (!header) {
		return [];
	}
	return header
		.split(",")
		.map((part) => {
			const [localeStr, quality = "q=1"] = part.trim().split(";");
			const q = Number.parseFloat(quality.replace("q=", ""));
			const locale = localeStr?.trim().split("-")[0] ?? "";
			return { locale, q };
		})
		.filter((item) => item.locale.length > 0)
		.sort((a, b) => b.q - a.q)
		.map((item) => item.locale);
}

export function getBetterAuthPlugins(
	env: Record<string, unknown> = process.env
) {
	const appName = typeof env.APP_NAME === "string" ? env.APP_NAME : undefined;
	const appDomain =
		typeof env.APP_DOMAIN === "string" ? env.APP_DOMAIN : undefined;
	const appBaseUrl =
		typeof env.APP_BASE_URL === "string" ? env.APP_BASE_URL : undefined;

	return [
		passkey({
			rpName: appName,
			rpID: appDomain,
			origin: appBaseUrl,
			advanced: {
				webAuthnChallengeCookie: WEBAUTHN_CHALLENGE_COOKIE,
			},
			schema: {
				passkey: {
					modelName: "passkeys",
					fields: {
						publicKey: "public_key",
						userId: "user_id",
						credentialID: "credential_id",
						deviceType: "device_type",
						backedUp: "backed_up",
						createdAt: "created_at",
					},
				},
			},
		}),
		admin({
			defaultRole: "user",
			adminRoles: ["admin"],
			schema: {
				user: {
					modelName: "users",
					fields: {
						banExpires: "ban_expires",
						banReason: "ban_reason",
						impersonatedBy: "impersonated_by",
					},
				},
				session: {
					modelName: "sessions",
					fields: {
						impersonatedBy: "impersonated_by",
					},
				},
			},
		}),
		oauthPopup(),
		multiSession({ maximumSessions: 3 }),
		haveIBeenPwned({
			customPasswordCompromisedMessage:
				"Please choose a more secure password.",
		}),
		localization({
			defaultLocale: "id-ID",
			fallbackLocale: "default",
			getLocale: async (request) => {
				const fallbackLocale = "default";
				if (!request) {
					return fallbackLocale;
				}
				try {
					const acceptLang =
						request.headers?.get("Accept-Language") ?? null;
					const preferred = parseAcceptLanguage(acceptLang)[0];
					return preferred?.startsWith("en") || !preferred
						? "default"
						: (preferred as BuiltInLocales);
				} catch {
					return fallbackLocale;
				}
			},
		}),
		apiKey({
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
						key: "hashed_key",
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
		bearer(),
		// #if DEV
		openAPI(),
		// #endif
	];
}

export function getAuthOptions(
	env: SharedEnv & Record<string, unknown> = process.env as any
) {
	return {
		appName: env.APP_NAME ?? "ItsRose",
		emailAndPassword: {
			enabled: true,
			autoSignIn: true,
			minPasswordLength: 8,
			maxPasswordLength: 20,
			resetPasswordTokenExpiresIn: 60 * 15,
		},
		socialProviders: {
			github: {
				enabled: !!(
					env.BETTER_AUTH_GITHUB_ID && env.BETTER_AUTH_GITHUB_SECRET
				),
				clientId: (env.BETTER_AUTH_GITHUB_ID as string) ?? "",
				clientSecret: (env.BETTER_AUTH_GITHUB_SECRET as string) ?? "",
			},
			google: {
				enabled: !!(
					env.BETTER_GOOGLE_CLIENT_ID &&
					env.BETTER_GOOGLE_CLIENT_SECRET
				),
				clientId: (env.BETTER_GOOGLE_CLIENT_ID as string) ?? "",
				clientSecret: (env.BETTER_GOOGLE_CLIENT_SECRET as string) ?? "",
				accessType: "offline",
				prompt: "select_account consent",
				display: "popup",
			},
		},
		account: {
			modelName: "accounts",
			accountLinking: {
				enabled: true,
				trustedProviders: ["google", "github"],
				allowUnlinkingAll: false,
			},
			fields: {
				accountId: "account_id",
				providerId: "provider_id",
				userId: "user_id",
				accessToken: "access_token",
				refreshToken: "refresh_token",
				idToken: "id_token",
				accessTokenExpiresAt: "access_token_expires_at",
				refreshTokenExpiresAt: "refresh_token_expires_at",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
			encryptOAuthTokens: true,
			updateAccountOnSignIn: true,
		},
		session: {
			storeSessionInDatabase: true,
			modelName: "sessions",
			fields: {
				userId: "user_id",
				expiresAt: "expires_at",
				ipAddress: "ip_address",
				userAgent: "user_agent",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
			cookieCache: {
				enabled: true,
				strategy: "jwe",
			},
		},
		user: {
			modelName: "users",
			fields: {
				emailVerified: "email_verified",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		},
		verification: {
			modelName: "verifications",
			fields: {
				expiresAt: "expires_at",
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		},
		experimental: { joins: true },
		advanced: {
			database: {
				generateId: "uuid",
			},
			useSecureCookies: true,
			cookiePrefix: COOKIE_PREFIX,
		},
	} satisfies BetterAuthOptions;
}

export const createBetterAuthServer = <Option extends BetterAuthOptions>(
	overrides: Partial<Option> = {}
) => {
	const env = process.env as unknown as SharedEnv & Record<string, unknown>;
	const baseOptions = getAuthOptions(env);
	const plugins = [
		...getBetterAuthPlugins(env),
		...(overrides?.plugins ?? []),
	];

	return betterAuth({
		...baseOptions,
		...overrides,
		emailAndPassword: {
			...baseOptions.emailAndPassword,
			...overrides.emailAndPassword,
		},
		advanced: {
			...baseOptions.advanced,
			...overrides.advanced,
		},
		telemetry: {
			enabled: env.NODE_ENV !== "production",
		},
		plugins,
	});
};

export type AuthServer = ReturnType<typeof createBetterAuthServer>;
