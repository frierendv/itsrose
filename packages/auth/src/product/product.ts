import type { Product } from "./types";

/**
 * Hardcoded product to satiesfies {@linkcode ProductBillingAdapterOptions}
 */
export const PRODUCTS = {
	hobby: "prod_zZYtP5N9NmdJtcPSGXBdY_1",
	pro: "prod_zZYtP5N9NmdJtcPSGXBdY",
	business: "prod_zZYtP5N9NmdJtcPSGXBdY_2",
} as const satisfies Product;
