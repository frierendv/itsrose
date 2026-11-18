import { requestPixverse } from "../client/send";
import type { AccountBalanceResponse } from "../zod-schema";
import { AccountBalanceResponseSchema } from "../zod-schema";

/**
 * Reads the credit balance of the API account.
 *
 * The balance is the authoritative record for reconciliation: the credits a
 * creation endpoint reports are a forecast, while promotions, refunds and
 * asynchronous settlement can move the final balance.
 *
 * @returns The credits the account holds.
 * @throws {UpstreamApiError} When PixVerse refused the query.
 */
export async function getAccountBalance(): Promise<AccountBalanceResponse> {
	return requestPixverse({
		url: "/openapi/v2/account/balance",
		method: "GET",
		schema: AccountBalanceResponseSchema,
		label: "account balance",
	});
}
