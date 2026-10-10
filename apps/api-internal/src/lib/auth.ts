import { FailureResponse } from "@itsrose/api-response";
import {
	FREE_PLAN,
	normalizePlan,
	RATE_LIMIT,
	resolveUserSubscription,
	type UserSubscription,
} from "@itsrose/auth/itsrose";
import type { AuthServer } from "@itsrose/auth/server";
import type { FastifyReply } from "fastify";

export const AUTH_ERRORS = {
	MISSING_TOKEN: {
		code: "UNAUTHORIZED",
		message:
			"No API key provided. Include a valid API key in the 'Authorization: Bearer <api_key>' header.",
		errors: {
			authorization:
				"Missing or malformed Authorization header. Expected format: 'Bearer <api_key>'.",
		},
	},
	INVALID_KEY: {
		code: "INVALID_CREDENTIALS",
		message: "The provided API key is invalid or unrecognized.",
		errors: {
			authorization:
				"The API key provided does not match any active credentials.",
		},
	},
	DISABLED_KEY: {
		code: "FORBIDDEN",
		message: "The provided API key has been disabled or revoked.",
		errors: {
			authorization:
				"This API key is deactivated. Please generate a new API key from your dashboard.",
		},
	},
	SUBSCRIPTION_REQUIRED: {
		code: "SUBSCRIPTION_REQUIRED",
		message: "An active subscription is required to access this API.",
		errors: {
			subscription:
				"No active subscription found for this account. Please subscribe to an active plan.",
		},
	},
	INSUFFICIENT_TIER: {
		code: "FORBIDDEN",
		message:
			"Your current subscription tier does not have access to this resource.",
		errors: {
			subscription:
				"An upgraded subscription plan is required to access this endpoint.",
		},
	},
} as const;

const BEARER_REGEX = /^Bearer\s+(.+)$/i;

export function extractBearerToken(
	authHeader: string | undefined
): string | null {
	if (!authHeader) {
		return null;
	}
	const match = BEARER_REGEX.exec(authHeader.trim());
	const token = match?.[1]?.trim();
	return token && token.length > 0 ? token : null;
}

export function deny(
	reply: FastifyReply,
	opts: Parameters<typeof FailureResponse.create>[0]
) {
	const response = FailureResponse.create(opts);
	return reply.status(response.statusCode).send(response.toJSON());
}

export function parseJson<T>(raw: string | null | undefined): T | null {
	if (!raw) {
		return null;
	}
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

export async function verifyApikey(auth: AuthServer, key: string) {
	return auth.api.verifyApiKey({ body: { key } });
}

export async function getSubscription(
	auth: AuthServer,
	userId: string
): Promise<UserSubscription> {
	try {
		const ctx = await auth.$context;
		return await resolveUserSubscription(ctx as any, userId);
	} catch {
		return {
			has_access: false,
			plan: normalizePlan(FREE_PLAN),
			status: "active",
			period_start: null,
			expires_at: null,
			rate_limit: RATE_LIMIT.free,
		};
	}
}
