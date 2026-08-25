import { FailureResponse } from "@itsrose/api-response";
import type { PaidProductId } from "@itsrose/auth/product";
import type { AuthServer, DatabasePool } from "@itsrose/auth/server";
import type { FastifyReply } from "fastify";

export type SubscriptionAccess = {
	hasAccess: boolean;
	status?: string;
	subscriptionId?: string;
	productId?: PaidProductId;
	periodStart?: Date | null;
	expiresAt?: Date | null;
	cancelAtPeriodEnd?: boolean;
};

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
	database: DatabasePool,
	userId: string
): Promise<SubscriptionAccess> {
	const query = `
		SELECT
			product_id,
			reference_id,
			creem_customer_id,
			creem_subscription_id,
			creem_order_id,
			status,
			period_start,
			period_end,
			cancel_at_period_end
		FROM creem_subscriptions
		WHERE reference_id = $1
			AND status IN ('active', 'trialing', 'paid')
			AND (period_end IS NULL OR period_end > NOW())
		ORDER BY period_end DESC NULLS LAST
		LIMIT 1;
	`;

	const { rows } = await database.query(query, [userId]);
	const activeSubscription = rows[0];

	if (activeSubscription) {
		return {
			hasAccess: true,
			status: activeSubscription.status as string,
			subscriptionId: activeSubscription.creem_subscription_id as string,
			productId: activeSubscription.product_id as
				PaidProductId | undefined,
			periodStart: activeSubscription.period_start
				? new Date(activeSubscription.period_start)
				: null,
			expiresAt: activeSubscription.period_end
				? new Date(activeSubscription.period_end)
				: null,
			cancelAtPeriodEnd: Boolean(activeSubscription.cancel_at_period_end),
		};
	}

	return {
		hasAccess: false,
	};
}
