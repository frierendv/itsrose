import {
	HttpClient,
	type HttpRequestConfig,
	type HttpRequestTransform,
	type HttpResponseTransform,
	type RetryConfig,
} from "@itsrose/http-client";
import { UpstreamApiError } from "../errors";
import { parseUpstreamPayload } from "../parse";
import type { UpstreamErrorMapper, UpstreamSchema } from "../types";

/**
 * Options of an {@linkcode UpstreamClient}.
 */
export interface UpstreamClientOptions {
	/**
	 * Logical name of the upstream service, e.g. `elevenlabs`.
	 *
	 * It is the name the shared failure carries, so a caller can tell which
	 * upstream refused the call.
	 */
	service: string;

	/**
	 * Base URL of the upstream service.
	 */
	baseURL?: string;

	/**
	 * Headers every request carries.
	 */
	headers?: Record<string, string>;

	/**
	 * Hook that rewrites the resolved request, e.g. to sign it.
	 */
	requestTransform?: HttpRequestTransform;

	/**
	 * Hook that rewrites the resolved response.
	 */
	responseTransform?: HttpResponseTransform;

	/**
	 * Retry policy of the client.
	 *
	 * `false` disables the retry entirely. A policy narrows the shared
	 * contract, e.g. `{ retryCondition: neverRetry }`.
	 */
	retry?: boolean | RetryConfig;

	/**
	 * Maps the error payload of the upstream onto the message a caller sees.
	 */
	mapError?: UpstreamErrorMapper;

	/**
	 * User agent the requests carry.
	 */
	userAgent?: string;

	/**
	 * Timeout of a request, in milliseconds.
	 */
	timeout?: number;
}

/**
 * A request the upstream client dispatches.
 *
 * It is the transport's own request configuration plus the two things that
 * belong to the seam rather than to the transport: the schema the response
 * is validated against, and the retry policy of this one call.
 */
export interface UpstreamRequestConfig<T = unknown> extends HttpRequestConfig {
	/**
	 * Schema the response payload is validated against.
	 *
	 * A payload that does not match is raised as the shared upstream
	 * failure instead of being returned half-empty.
	 */
	schema?: UpstreamSchema<T>;

	/**
	 * Retry policy of this call only.
	 *
	 * `false` disables the retry for this call. A policy narrows the shared
	 * contract, e.g. `{ retryCondition: neverRetry }`.
	 */
	retry?: RetryConfig | false;
}

/**
 * A request configuration that carries the transport's own retry slot.
 */
type RetryableRequestConfig = HttpRequestConfig & {
	"axios-retry"?: RetryConfig;
};

/**
 * What the upstream answered with.
 */
export interface UpstreamResponse<T = unknown> {
	/**
	 * The payload, validated against the schema when one was given.
	 */
	data: T;

	/**
	 * HTTP status the upstream answered with.
	 */
	status: number;

	/**
	 * HTTP status text the upstream answered with.
	 */
	statusText: string;

	/**
	 * The response headers.
	 */
	headers: Record<string, unknown>;
}

/**
 * The message a failure is reported with when the upstream did not say
 * anything useful.
 *
 * @param service The upstream the call was made against.
 * @param status The status the upstream answered with, when it answered.
 * @param cause The underlying failure, when there was one.
 * @returns A human-readable description of the failure.
 */
function defaultMessage(
	service: string,
	status?: number,
	cause?: unknown
): string {
	if (status !== undefined) {
		return `The ${service} service answered with status ${status}.`;
	}

	if (cause instanceof Error && cause.message) {
		return `The ${service} service could not be reached: ${cause.message}`;
	}

	return `The ${service} service could not be reached.`;
}

/**
 * The one client the feature packages reach an upstream through.
 *
 * It owns three things the transport does not:
 *
 * - **the failure shape**: every failed call is raised as the shared
 *   {@linkcode UpstreamApiError}, whatever the upstream answered;
 * - **the schema**: a response is validated against the schema the package
 *   publishes for it, so an upstream drift is an error instead of an
 *   `undefined` inside a payload;
 * - **the retry policy**: the shared contract by default, narrowed per call
 *   for the requests that must not be replayed.
 *
 * The transport methods of {@linkcode HttpClient} are inherited, so a
 * client can still be used as one. They are not the way to call an
 * upstream: {@linkcode UpstreamClient.send} is.
 */
export class UpstreamClient extends HttpClient {
	/**
	 * Logical name of the upstream service, e.g. `elevenlabs`.
	 */
	public readonly service: string;

	private readonly mapError?: UpstreamErrorMapper;

	/**
	 * Creates a client for one upstream service.
	 *
	 * @param options The service and the way it is reached.
	 */
	constructor(options: UpstreamClientOptions) {
		super({
			baseURL: options.baseURL,
			headers: options.headers,
			requestTransform: options.requestTransform,
			responseTransform: options.responseTransform,
			retry: options.retry,
			userAgent: options.userAgent,
			timeout: options.timeout,
		});

		this.service = options.service;
		this.mapError = options.mapError;
	}

	/**
	 * Calls the upstream and returns its validated payload.
	 *
	 * @param config The request, the schema of the response and the retry
	 * policy of this call.
	 * @returns The payload the upstream answered with.
	 * @throws {UpstreamApiError} When the call failed or the payload did not
	 * match the schema.
	 */
	public async send<T = unknown>(
		config: UpstreamRequestConfig<T>
	): Promise<T> {
		const response = await this.sendWithResponse<T>(config);
		return response.data;
	}

	/**
	 * Calls the upstream and returns what it answered with.
	 *
	 * Some upstreams carry information in their headers that the payload
	 * does not hold — a multipart boundary, a content type — so the response
	 * itself is sometimes what a caller needs.
	 *
	 * @param config The request, the schema of the response and the retry
	 * policy of this call.
	 * @returns The payload and the response it came in.
	 * @throws {UpstreamApiError} When the call failed or the payload did not
	 * match the schema.
	 */
	public async sendWithResponse<T = unknown>(
		config: UpstreamRequestConfig<T>
	): Promise<UpstreamResponse<T>> {
		const { schema, retry, ...requestConfig } = config;

		const response = await this.dispatch(requestConfig, retry);

		if (!response.ok) {
			throw this.toFailure(
				response.status,
				response.data,
				response.error
			);
		}

		const data = schema
			? parseUpstreamPayload(schema, response.data, {
					service: this.service,
				})
			: (response.data as T);

		return {
			data,
			status: response.status ?? 0,
			statusText: response.statusText ?? "",
			headers: response.headers,
		};
	}

	/**
	 * Dispatches the request and turns a transport failure into the shared
	 * failure shape.
	 *
	 * @param config The request configuration.
	 * @param retry The retry policy of this call, when it differs.
	 * @returns The transport response.
	 */
	private async dispatch(
		config: HttpRequestConfig,
		retry?: RetryConfig | false
	) {
		const requestConfig: RetryableRequestConfig = { ...config };

		if (retry !== undefined) {
			requestConfig["axios-retry"] =
				retry === false ? { retries: 0 } : retry;
		}

		try {
			return await this.request<unknown>(requestConfig);
		} catch (error) {
			throw this.toFailure(undefined, undefined, error);
		}
	}

	/**
	 * Builds the shared failure out of what the upstream answered.
	 *
	 * @param status The status the upstream answered with.
	 * @param payload The raw payload the upstream answered with.
	 * @param cause The underlying failure.
	 * @returns The failure to raise.
	 */
	private toFailure(
		status: number | undefined,
		payload: unknown,
		cause: unknown
	): UpstreamApiError {
		const mapped = this.mapError?.(payload, {
			service: this.service,
			status,
		});

		return new UpstreamApiError(
			mapped?.message ?? defaultMessage(this.service, status, cause),
			mapped?.statusCode ?? 500,
			{
				service: this.service,
				upstreamStatus: status,
				details: payload,
				cause,
			}
		);
	}
}

/**
 * Creates a client for one upstream service.
 *
 * @param options The service and the way it is reached.
 * @returns The client.
 */
export function createUpstreamClient(
	options: UpstreamClientOptions
): UpstreamClient {
	return new UpstreamClient(options);
}
