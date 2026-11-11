import type {
	HttpClient,
	HttpConfig,
	HttpRequestConfig,
} from "@itsrose/http-client";
import type { ClientContext } from "../client/context";
import type { MidtransApiError } from "../client/error";
import type { MidtransHeaders, RequestOptions } from "../typings";

/**
 * Base class for every Midtrans API service.
 *
 * Services receive the shared {@link ClientContext} and never import
 * `MidtransClient`, which keeps the dependency direction one-way:
 *
 * `client → api → context`.
 *
 * @internal
 */
export abstract class BaseService<TError = MidtransApiError> {
	protected readonly ctx!: ClientContext;

	public constructor(ctx: ClientContext) {
		Object.defineProperty(this, "ctx", {
			value: ctx,
			enumerable: false,
			writable: false,
			configurable: false,
		});
	}

	/* ---------- Exposed api ---------- */

	protected get http(): HttpClient<HttpConfig, TError> {
		return this.ctx.http as unknown as HttpClient<HttpConfig, TError>;
	}

	protected get baseUrl(): string {
		return this.ctx.merchant.baseUrl;
	}

	protected get snapBaseUrl(): string {
		return this.ctx.merchant.snapBaseUrl;
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

		const config: HttpRequestConfig = {
			headers,
			timeout: opts.timeout,
		};
		if (opts.signal) {
			config.signal = opts.signal;
		}
		return config;
	}
}
