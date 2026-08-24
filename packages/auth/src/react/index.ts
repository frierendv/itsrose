import getBetterAuthClientPlugins from "./plugins";
import createBetterAuthClient from "./react";

export { getBetterAuthClientPlugins, createBetterAuthClient };

export type BetterAuthClient = ReturnType<typeof createBetterAuthClient>;
export type {
	CreateCheckoutInput,
	CreateCheckoutResponse,
	CheckoutCustomer,
	CreatePortalInput,
	CreatePortalResponse,
	CancelSubscriptionInput,
	CancelSubscriptionResponse,
	RetrieveSubscriptionInput,
	SubscriptionData,
	SearchTransactionsInput,
	SearchTransactionsResponse,
	TransactionData,
	HasAccessGrantedResponse,
} from "@creem_io/better-auth";
