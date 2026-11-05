import {
	createBillingRepositories,
	ensurePersonalTenant,
} from "@itsrose/auth-billing/server";
import { tenantIdForUser } from "@itsrose/auth-usage/server";
import type { BetterAuthOptions } from "better-auth";
import type { SharedEnv } from "../shared";
import { COOKIE_PREFIX } from "../shared/constants";
import { resolveGoogleOAuthCredentials } from "../shared/env";

export function getAuthOptions(
	env: SharedEnv & Record<string, unknown> = process.env as any
) {
	const google = resolveGoogleOAuthCredentials(env);
	return {
		appName: env.APP_NAME ?? "ItsRose",
		emailAndPassword: {
			enabled: true,
			autoSignIn: true,
			minPasswordLength: 8,
			maxPasswordLength: 20,
			// handled in eusend
			// resetPasswordTokenExpiresIn: 60 * 15,
			// requireEmailVerification: true,
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
				enabled: Boolean(google.clientId && google.clientSecret),
				clientId: google.clientId ?? "",
				clientSecret: google.clientSecret ?? "",
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
			// freshAge: 60 * 5, // let use default
			cookieCache: {
				enabled: true,
				// maxAge: 5 * 60, // let use default
				strategy: "jwe",
				version: env.NODE_ENV === "production" ? "pr_" : "dev_",
			},
		},
		user: {
			deleteUser: {
				enabled: true,
			},
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
		databaseHooks: {
			user: {
				create: {
					/**
					 * Bootstraps the 1:1 personal tenant. Best effort: if it
					 * fails, metering still attributes traffic because the
					 * tenant id is derived from the user id.
					 */
					after: async (user, ctx) => {
						if (!ctx) {
							return;
						}
						try {
							const repositories = createBillingRepositories(ctx);
							await ensurePersonalTenant(repositories, {
								user_id: user.id,
								tenant_id: tenantIdForUser(user.id),
							});
						} catch {
							// Soft failure: never block signup.
						}
					},
				},
			},
		},
		advanced: {
			ipAddress: {
				ipAddressHeaders: ["x-forwarded-for", "cf-connecting-ip"],
			},
			database: {
				joins: true,
				generateId: "uuid",
			},
			useSecureCookies: env.NODE_ENV === "production",
			cookiePrefix: COOKIE_PREFIX,
			crossSubDomainCookies: {
				enabled: env.NODE_ENV === "production",
				// ie. "itsrose.my.id"
				domain: env.ROOT_DOMAIN,
			},
			defaultCookieAttributes: {
				sameSite: env.NODE_ENV === "production" ? "none" : "lax",
				secure: env.NODE_ENV === "production",
				httpOnly: true,
			},
			trustedProxyHeaders: true,
		},
	} satisfies BetterAuthOptions;
}
