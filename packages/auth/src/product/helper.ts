import { PRODUCTS } from "./product";
import { RATE_LIMIT } from "./rate-limit";
import type { PaidProductPlanId } from "./types";

export type PaidProductId = (typeof PRODUCTS)[PaidProductPlanId];
export type PaidProductKey = keyof typeof PRODUCTS;
export type ProductById = Record<PaidProductId, PaidProductKey>;

export const PRODUCTS_BY_ID = Object.fromEntries(
	Object.entries(PRODUCTS).map(([key, value]) => [value, key])
) as ProductById;
/**
 * Rate limit by product id `prod_xxx`.
 *
 * Fallback to `free`
 */
export function resolveRateLimit<T extends PaidProductId>(
	productId?: T,
	hasAccess?: boolean
) {
	if (!hasAccess || !productId) {
		return RATE_LIMIT["free"];
	}
	const paidPlan = PRODUCTS_BY_ID[productId];
	return RATE_LIMIT[paidPlan ?? "paid"];
}
