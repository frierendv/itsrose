import type {
	HttpClient,
	HttpConfig,
	HttpRequestConfig,
} from "@itsrose/http-client";
import type { MidtransClient } from "../client/client";
import type { MidtransHeaders, RequestOptions } from "../typings";

/** @internal */
export const SHARED_CLIENT: unique symbol = Symbol("__MIDTRANS_CLIENT__");
/** @internal */
export const SHARED_HTTP_CLIENT: unique symbol = Symbol("__HTTP_CLIENT__");

export abstract class SharedClient<TError = unknown> {
	declare protected readonly [SHARED_CLIENT]: MidtransClient;
	constructor(__this__: MidtransClient) {
		Object.defineProperty(this, SHARED_CLIENT, {
			value: __this__,
			writable: false,
			configurable: false,
			enumerable: false,
		});
	}
	/* ---------- Exposed api ---------- */

	protected get http() {
		return this[SHARED_CLIENT][SHARED_HTTP_CLIENT] as unknown as HttpClient<
			HttpConfig,
			TError
		>;
	}

	protected get baseUrl(): string {
		return this[SHARED_CLIENT].merchant.baseUrl;
	}

	protected get snapBaseUrl(): string {
		return this[SHARED_CLIENT].merchant.snapBaseUrl;
	}

	/**
	 * Resolves request-specific options.
	 *
	 * Including idempotency and custom notification webhooks headers.
	 */
	protected resolveRequestOptions(
		opts?: RequestOptions
	): HttpRequestConfig | undefined {
		if (!opts) {
			return undefined;
		}

		const headers: MidtransHeaders = {
			...opts.headers,
		};

		if (opts.idempotencyKey) {
			headers["X-Idempotency-Key"] = opts.idempotencyKey;
		}

		if (opts.appendNotification) {
			headers["X-Append-Notification"] = opts.appendNotification;
		}

		if (opts.overrideNotification) {
			headers["X-Override-Notification"] = opts.overrideNotification;
		}

		return { headers, timeout: opts?.timeout };
	}
}
