import { COOKIE_PREFIX } from "@/shared/constant";
import type { SharedEnv } from "@/shared/env";
import { parseAcceptLanguage } from "@/utils";
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
import { betterAuthServicePlugins } from "./service";
// #if DEV
// prettier-ignore
import { openAPI } from "better-auth/plugins";

// #endif

const env = process.env as SharedEnv & Record<string, unknown>;
export const authOptions = {
	appName: "ItsRose",
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		minPasswordLength: 8,
		maxPasswordLength: 20,
		resetPasswordTokenExpiresIn: 60 * 15, // 15 minutes
	},
	socialProviders: {
		github: {
			enabled: !!(
				env.BETTER_AUTH_GITHUB_ID && env.BETTER_AUTH_GITHUB_SECRET
			),
			clientId: env.BETTER_AUTH_GITHUB_ID as string,
			clientSecret: env.BETTER_AUTH_GITHUB_SECRET as string,
		},
		google: {
			enabled: !!(
				env.BETTER_GOOGLE_CLIENT_ID && env.BETTER_GOOGLE_CLIENT_SECRET
			),
			clientId: env.BETTER_GOOGLE_CLIENT_ID as string,
			clientSecret: env.BETTER_GOOGLE_CLIENT_SECRET as string,
			accessType: "offline",
			prompt: "select_account consent",
		},
	},
	account: {
		modelName: "accounts",
		accountLinking: {
			enabled: true,
			trustedProviders: ["google", "github"],
		},
		// remap model casing snake case
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
		modelName: "sessions",
		// remap model casing snake case
		fields: {
			userId: "user_id",
			expiresAt: "expires_at",
			ipAddress: "ip_address",
			userAgent: "user_agent",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
		// 1 day
		expiresIn: 60 * 60 * 24,
		updateAge: 60 * 15, // 15 minutes
		cookieCache: {
			enabled: true,
			strategy: "jwe",
			maxAge: 5 * 60,
		},
	},
	user: {
		modelName: "users",
		// remap model casing snake case
		fields: {
			emailVerified: "email_verified",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
	},
	verification: {
		modelName: "verifications",
		// remap model casing snake case
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
	telemetry: {
		enabled: env.NODE_ENV !== "production",
	},
} satisfies BetterAuthOptions;

const betterAuthPlugins = [
	passkey({
		rpName: env.APP_NAME,
		rpID: env.APP_DOMAIN,
		origin: env.APP_BASE_URL,
		advanced: {
			webAuthnChallengeCookie: "itsrose_webauthn_challenge",
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

			// for now just like this.
			try {
				const acceptLang =
					request.headers?.get("Accept-Language") ?? null;
				const preferred = parseAcceptLanguage(acceptLang)[0];
				return preferred?.startsWith("en")
					? "default"
					: (preferred as BuiltInLocales);
			} catch {
				return fallbackLocale;
			}
		},
	}),
	...betterAuthServicePlugins,
	bearer(),
];

export const createAuthServer = (overrides: BetterAuthOptions = {}) => {
	const plugins = betterAuthPlugins;
	if (overrides.plugins) {
		plugins.push(...(overrides.plugins as any));
	}
	// #if DEV
	plugins.push(openAPI() as any);
	// #endif
	return betterAuth({
		...authOptions,
		...overrides,
		emailAndPassword: {
			...authOptions.emailAndPassword,
			...overrides.emailAndPassword,
		},
		advanced: {
			...authOptions.advanced,
			...overrides.advanced,
		},
		plugins,
	});
};
