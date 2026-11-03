import { apiKey } from "@better-auth/api-key";
import { dash } from "@better-auth/infra";
import { passkey } from "@better-auth/passkey";
import {
	admin,
	bearer,
	haveIBeenPwned,
	lastLoginMethod,
	oauthPopup,
	openAPI,
} from "better-auth/plugins";
import { eusendPlugin } from "../eusend";
import { itsRosePlugin } from "../itsrose/plugin-server";
import type { SharedEnv } from "../shared";
import { LAST_LOGIN_METHOD_COOKIE, WEBAUTHN_CHALLENGE_COOKIE } from "../shared";
import { storagePlugin } from "../storage/plugin-server";

export default function (env = process.env as SharedEnv) {
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
		haveIBeenPwned(),
		apiKey({
			defaultPrefix: "sk_",
			references: "user",
			rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 10 },
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
		bearer(),
		oauthPopup(),
		lastLoginMethod({ cookieName: LAST_LOGIN_METHOD_COOKIE }),
		openAPI(),
		dash({
			apiKey: env.BETTER_AUTH_API_KEY,
			activityTracking: {
				enabled: true, // Enable activity tracking
			},
		}),
		eusendPlugin({
			apiKey:
				typeof env.EUSEND_API_KEY === "string"
					? env.EUSEND_API_KEY
					: undefined,
			from:
				typeof env.EUSEND_FROM === "string"
					? env.EUSEND_FROM
					: appDomain
						? `noreply@${appDomain}`
						: undefined,
			appName,
		}),
		itsRosePlugin(),
		storagePlugin(),
	];
}
