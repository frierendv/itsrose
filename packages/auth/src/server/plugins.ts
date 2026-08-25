import { apiKey } from "@better-auth/api-key";
import { dash } from "@better-auth/infra";
import { passkey } from "@better-auth/passkey";
import { creem, type CreemOptions } from "@creem_io/better-auth";
import { localization, type BuiltInLocales } from "better-auth-localization";
import {
	admin,
	bearer,
	haveIBeenPwned,
	multiSession,
	oauthPopup,
} from "better-auth/plugins";
import type { SharedEnv } from "../shared";
import { WEBAUTHN_CHALLENGE_COOKIE } from "../shared";
// #if DEV
// prettier-ignore
import { openAPI } from "better-auth/plugins";

// #endif

function parseAcceptLanguage(header: string | null): string[] {
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

export default function (env = process.env as SharedEnv) {
	const appName = typeof env.APP_NAME === "string" ? env.APP_NAME : undefined;
	const appDomain =
		typeof env.APP_DOMAIN === "string" ? env.APP_DOMAIN : undefined;
	const appBaseUrl =
		typeof env.APP_BASE_URL === "string" ? env.APP_BASE_URL : undefined;

	const creemSchema = {
		user: {
			modelName: "users",
			fields: {
				creemCustomerId: "creem_customer_id",
				hadTrial: "had_trial",
			},
		},
		creem_subscription: {
			modelName: "creem_subscriptions",
			fields: {
				productId: "product_id",
				referenceId: "reference_id",
				creemCustomerId: "creem_customer_id",
				creemSubscriptionId: "creem_subscription_id",
				creemOrderId: "creem_order_id",
				periodStart: "period_start",
				periodEnd: "period_end",
				cancelAtPeriodEnd: "cancel_at_period_end",
			},
		},
	};
	const isProd = env.NODE_ENV === "production";
	const creemOptions = {
		apiKey: (isProd
			? env.CREEM_PRODUCTION_API_KEY
			: env.CREEM_DEVELOPMENT_API_KEY) as string,
		// test mode for development
		testMode: !isProd,
		webhookSecret: isProd
			? env.CREAM_PRODUCTION_WEB_HOOK_SECRET
			: env.CREEM_DEVELOPMENT_WEB_HOOK_SECRET,
		persistSubscriptions: true,
		// @ts-expect-error - schema not infered
		schema: creemSchema as CreemOptions["schema"],
	} satisfies CreemOptions;
	return [
		passkey({
			rpName: appName,
			rpID: appDomain,
			origin: appBaseUrl,
			advanced: {
				webAuthnChallengeCookie: WEBAUTHN_CHALLENGE_COOKIE,
			},
			registration: {
				requireSession: true,
				extensions: { credProps: true },
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
			startingCharactersConfig: { shouldStore: true },
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
		creem(creemOptions),
		bearer(),
		oauthPopup(),
		// #if DEV
		openAPI(),
		// #endif
		dash({
			apiKey: env.BETTER_AUTH_API_KEY,
			activityTracking: {
				enabled: true, // Enable activity tracking
			},
		}),
	];
}
