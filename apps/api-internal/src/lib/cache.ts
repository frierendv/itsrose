export const CACHE_NAMESPACE = "api";

export const CACHE_KEYS = {
	/**
	 * Hashed token for API key cache
	 */
	apiKey: (hashedToken: string) =>
		`${CACHE_NAMESPACE}:api-key:${hashedToken}`,

	/**
	 * Bad/invalid hashed API key token or unauthorized user
	 */
	badToken: (str: string) => `${CACHE_NAMESPACE}:bad-token:${str}`,

	/**
	 * Disabled/revoked API key token
	 */
	disabled: (hashedToken: string) =>
		`${CACHE_NAMESPACE}:disabled:${hashedToken}`,

	/**
	 * User subscription access cache
	 */
	subscriptionAccess: (userId: string) =>
		`${CACHE_NAMESPACE}:sub-access:${userId}`,

	/**
	 * Inactive/bad subscription negative cache
	 */
	badSubscription: (userId: string) => `${CACHE_NAMESPACE}:sub-bad:${userId}`,

	/**
	 * Full subscription entity cache by subscription ID
	 */
	subscriptionEntity: (subscriptionId: string) =>
		`${CACHE_NAMESPACE}:sub-entity:${subscriptionId}`,
} as const;

export const CACHE_TTL = {
	/** 5 minutes for valid API keys */
	API_KEY: 300,
	/** 5 minutes for active subscriptions */
	SUBSCRIPTION: 300,
	/** 2 minutes for invalid API keys */
	BAD_TOKEN: 120,
	/** 2 minutes for disabled API keys */
	DISABLED_TOKEN: 120,
	/** 1 minute for users without active subscription */
	BAD_SUBSCRIPTION: 60,
} as const;
