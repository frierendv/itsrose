import { getEnv, ThirdPartyApiError } from "@itsrose/system";
import {
	neverRetry,
	UpstreamClient,
	type HttpRequestConfig,
	type HttpRequestTransform,
	type HttpRequestTransformContext,
} from "@itsrose/upstream-client";
import { MTXX_ENV } from "../env";
import type { IInferenceResponse, MtlabInferenceData } from "../types";
import type { ISDKParameter } from "../utils";
import { DEFAULT_ERROR, ERROR_MAP } from "./error";
import { Signer } from "./signer";

/**
 * Everything the request hook needs to route and sign a request.
 */
interface MtxxRequestOptions {
	/** Origin of the SDK API. Requests to it are signed. */
	sdkBaseUrl: string;
	/** Origin of the openapi API. Requests to it carry the credentials in the query. */
	openApiBaseUrl: string;
	/** Access key. */
	key: string;
	/** Access secret. */
	secret: string;
	/** Signer used to sign SDK requests. */
	signer: Signer;
}

/**
 * Signs the configuration of an SDK request.
 *
 * @param config Resolved request configuration.
 * @param signer Signer holding the SDK credentials.
 * @returns The same configuration, with the signature applied.
 */
function signConfig(
	config: HttpRequestTransformContext,
	signer: Signer
): HttpRequestTransformContext {
	const params = config.params
		? `?${new URLSearchParams(config.params).toString()}`
		: "";
	const url = new URL((config.url || "") + params, config.baseURL);
	const { headers, ...options } = signer.sign(
		url.href,
		config.method?.toUpperCase() || "GET",
		{ Host: url.host },
		config.data ? JSON.stringify(config.data) : ""
	);
	Object.assign(config, options);
	if (config.headers) {
		Object.assign(config.headers, headers);
	}
	return config;
}

/**
 * Builds the request hook of the MTXX client.
 *
 * The hook receives the resolved configuration, so `config.baseURL` is the
 * effective base URL of the request: SDK requests are signed, openapi requests
 * carry the credentials in the query string.
 *
 * @param options Routing and credential options.
 * @returns The request hook.
 */
function createRequestTransform(
	options: MtxxRequestOptions
): HttpRequestTransform {
	return (config) => {
		// only intercept if the request is to the sdk base URL
		if (config.baseURL === options.sdkBaseUrl) {
			return signConfig(config, options.signer);
		}
		// if the request is to the openapi base URL, add the api_key and api_secret to the query parameters
		if (config.baseURL === options.openApiBaseUrl) {
			return {
				...config,
				params: {
					api_key: options.key,
					api_secret: options.secret,
					...config.params,
				},
			};
		}
		return config;
	};
}

export class Client extends UpstreamClient {
	private readonly _sdkBaseUrl: string;
	private readonly _openApiBaseUrl: string;

	public appVersion = getEnv(MTXX_ENV.appVersion, {
		defaultValue: "12.11.5",
	});

	constructor() {
		const sdkUrl = new URL(
			getEnv(MTXX_ENV.sdkBaseUrl, { isRequired: true })
		);
		const openApiUrl = new URL(
			getEnv(MTXX_ENV.openapiBaseUrl, { isRequired: true })
		);
		const key = getEnv(MTXX_ENV.key, { isRequired: true });
		const secret = getEnv(MTXX_ENV.secret, { isRequired: true });
		const signer = new Signer({ key, secret });

		super({
			service: "mtxx",
			baseURL: sdkUrl.origin,
			headers: {
				"User-Agent": "mtxx-121105-OnePlus-NE2210-android-9-c1923306",
			},
			requestTransform: createRequestTransform({
				sdkBaseUrl: sdkUrl.origin,
				openApiBaseUrl: openApiUrl.origin,
				key,
				secret,
				signer,
			}),
		});

		this.setDefaultHeader("x-mtcc-client", this._mttc());
		this._sdkBaseUrl = sdkUrl.origin;
		this._openApiBaseUrl = openApiUrl.origin;
	}

	public get sdkBaseUrl() {
		return this._sdkBaseUrl;
	}
	public get openApiBaseUrl() {
		return this._openApiBaseUrl;
	}

	private _mttc() {
		const mttc = {
			ext_info: { app_version: this.appVersion },
			app_id: "18",
			os_type: "android",
			country_code: "ID",
			gnum: "-1",
		};
		return Buffer.from(JSON.stringify(mttc)).toString("base64");
	}

	/**
	 * Checks if the provided error code indicates an error
	 * and throws a {@linkcode ThirdPartyApiError} if it does.
	 */
	private _mtxxErrorGuard(code?: number) {
		const hasError = code !== 0 && code !== undefined;
		if (!hasError) {
			return;
		}
		const error = ERROR_MAP[code] || DEFAULT_ERROR;
		throw new ThirdPartyApiError(error.message, error.statusCode);
	}
	/**
	 * Fetches the status of a task with the given task ID
	 * and returns the {@linkcode IInferenceResponse}.
	 */
	public async getTaskStatus<T = unknown>(taskId: string) {
		const data = await this.send<IInferenceResponse<T>>({
			url: "/api/v1/sdk/status",
			params: { task_id: taskId },
		});
		this._mtxxErrorGuard(data.code);
		return data;
	}
	/**
	 * Creates a new task with the given {@linkcode ISDKParameter}
	 * and returns the {@linkcode IInferenceResponse}.
	 */
	public async createTask<T = object>(parameter: ISDKParameter) {
		const data = await this.send<IInferenceResponse<T>>({
			url: "/api/v1/sdk/sync/push",
			method: "post",
			data: parameter,
			// The call creates a task upstream: it must not be replayed.
			retry: { retryCondition: neverRetry },
		});
		this._mtxxErrorGuard(data.code);
		return data;
	}
	/**
	 * Creates a new task using the Mtlab API with the given {@linkcode IRequestConfig}
	 * and returns the {@linkcode MtlabInferenceData}.
	 */
	public async createMtlabTask<T = object>(
		config: HttpRequestConfig &
			Required<Pick<HttpRequestConfig, "data" | "url">>
	) {
		const data = await this.send<MtlabInferenceData<T>>({
			method: "post",
			baseURL: this.openApiBaseUrl,
			...config,
			// The call creates a task upstream: it must not be replayed.
			retry: { retryCondition: neverRetry },
		});
		this._mtxxErrorGuard(data?.ErrorCode);
		return data;
	}
}

export const client = new Client();
