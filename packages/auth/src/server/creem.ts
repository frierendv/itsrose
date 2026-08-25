import type { CreemOptions } from "@creem_io/better-auth";
import { Creem } from "creem";

export type { CreemOptions, Creem };

export const createCreem = (options: CreemOptions) => {
	const { apiKey, testMode = true } = options;
	const server = testMode ? "test" : "prod";

	const creem = new Creem({ apiKey, server });

	return creem;
};

export type {
	GrantAccessContext,
	RevokeAccessContext,
	GrantAccessReason,
	RevokeAccessReason,
	FlatCheckoutCompleted,
	FlatRefundCreated,
	FlatDisputeCreated,
	FlatSubscriptionEvent,
} from "@creem_io/better-auth";

export type * from "creem/models/components";
