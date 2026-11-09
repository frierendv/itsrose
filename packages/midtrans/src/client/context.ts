import type { HttpClient } from "@itsrose/http-client";
import type { MidtransMerchant } from "./merchant";

/**
 * Runtime context shared by every Midtrans API service.
 *
 * Services depend on this small structure instead of `MidtransClient`, which
 * removes the `client` ↔ `api` import cycle and lets each service be tested
 * with a plain context object.
 *
 * @internal
 */
export interface ClientContext {
	/** Resolved runtime environment. */
	readonly environment: "production" | "sandbox";
	/** Resolved merchant identity and endpoint configuration. */
	readonly merchant: MidtransMerchant;
	/** Shared HTTP transport used by every service. */
	readonly http: HttpClient;
}
