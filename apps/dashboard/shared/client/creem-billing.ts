import { createCreemBillingAdapter } from "@better-auth-ui/core/plugins/billing";
import { BILLING_PLANS, PRODUCTS } from "@itsrose/auth/product";
import { DASHBOARD_ROOT_PATH } from "../dashboard";
import { mergePath } from "../utils";
import { authClient } from "./auth-client";

export const creemBillingAdapter = createCreemBillingAdapter(
	// @ts-expect-error casting correct type instead of any
	authClient,
	{
		plans: BILLING_PLANS,
		products: PRODUCTS,
		successUrl: mergePath(
			DASHBOARD_ROOT_PATH,
			"/settings/billing?checkout=success"
		),
		cancelUrl: mergePath(
			DASHBOARD_ROOT_PATH,
			"/settings/billing?checkout=canceled"
		),
		returnUrl: mergePath(DASHBOARD_ROOT_PATH, "/settings/billing"),
	}
);
