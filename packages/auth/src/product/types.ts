export type ProductPlanId = "free" | "hobby" | "pro" | "business";
export type PaidProductPlanId = Exclude<ProductPlanId, "free">;

export type RateLimitOption = {
	readonly max: number;
	readonly timeWindow: number;
};
export type RateLimit = {
	readonly [T in ProductPlanId]: RateLimitOption;
} & { readonly paid: RateLimitOption };

export type Product = {
	readonly [T in PaidProductPlanId]: `${string}`;
} & {
	readonly [key: `${string}`]: string;
};

// -------------
/**
 * Taken from {@link https://github.com/better-auth-ui/better-auth-ui/blob/main/packages/core/src/plugins/billing/billing-adapter.ts#L9C1-L27C2 | @better-auth-ui/core/plugins/billing-adapter}
 *
 * In order to satiesfies the types
 */
export type BillingAdapter<T> = T;
/** {@inheritdoc BillingAdapter} */
export type BillingInterval = BillingAdapter<"one-time" | "month" | "year">;
/** {@inheritdoc BillingAdapter} */
export type BillingPrice = BillingAdapter<{
	id: string;
	amount: number;
	currency: string;
	interval: BillingInterval;
	intervalCount?: number;
}>;
/** {@inheritdoc BillingAdapter} */
export type BillingPlan = BillingAdapter<{
	id: ProductPlanId;
	name: string;
	description?: string;
	prices: BillingPrice[];
	features?: string[];
	highlighted?: boolean;
	seatBased?: boolean;
}>;
// -------------
