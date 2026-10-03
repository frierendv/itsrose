import { HttpClient, type HttpRequestConfig } from "@itsrose/http-client";
import { getEnv, ThirdPartyApiError } from "@itsrose/system";
import type { IInferenceResponse, MtlabInferenceData } from "../types";
import type { ISDKParameter } from "../utils";
import { DEFAULT_ERROR, ERROR_MAP } from "./error";
import { Signer } from "./signer";

class BaseHttpClient extends HttpClient {
	private readonly _sdkBaseUrl: string;
	private readonly _openApiBaseUrl: string;
	#secret: string;
	#key: string;
	#signer: Signer;

	public appVersion = getEnv("MTXX_APP_VERSION", { defaultValue: "12.11.5" });

	constructor() {
		const sdkUrl = new URL(
			getEnv("MTXX_SDK_BASE_URL", { isRequired: true })
		);
		const openApiUrl = new URL(
			getEnv("MTXX_OPENAPI_BASE_URL", { isRequired: true })
		);
		super({
			baseURL: sdkUrl.origin,
			headers: {
				"User-Agent": "mtxx-121105-OnePlus-NE2210-android-9-c1923306",
				// "x-mtcc-client": this._mttc(),
				// "Host": this.sdkUrl.host,
			},
		});
		this.defaults.headers.common["x-mtcc-client"] = this._mttc();
		this._sdkBaseUrl = sdkUrl.origin;
		this._openApiBaseUrl = openApiUrl.origin;

		this.#key = getEnv("MTXX_KEY", { isRequired: true });
		this.#secret = getEnv("MTXX_SECRET", { isRequired: true });
		this.#signer = new Signer({ key: this.#key, secret: this.#secret });

		this.interceptors.request.use((config) => {
			// only intercept if the request is to the sdk base URL
			if (config.baseURL === this._sdkBaseUrl) {
				return this._signConfig(config) as typeof config;
			}
			// if the request is to the openapi base URL, add the api_key and api_secret to the query parameters
			if (config.baseURL === this._openApiBaseUrl) {
				return {
					...config,
					params: {
						api_key: this.#key,
						api_secret: this.#secret,
						...config.params,
					},
				};
			}
			return config;
		});
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

	private _signConfig(config: HttpRequestConfig) {
		const params = config.params
			? `?${new URLSearchParams(config.params).toString()}`
			: "";
		const url = new URL((config.url || "") + params, config.baseURL);
		const { headers, ...options } = this.#signer.sign(
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
}

export class Client extends BaseHttpClient {
	// constructor() {
	// 	super();
	// }
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
		const { data } = await this.get<IInferenceResponse<T>>(
			"/api/v1/sdk/status",
			{ params: { task_id: taskId } }
		);
		this._mtxxErrorGuard(data.code);
		return data;
	}
	/**
	 * Creates a new task with the given {@linkcode ISDKParameter}
	 * and returns the {@linkcode IInferenceResponse}.
	 */
	public async createTask<T = object>(parameter: ISDKParameter) {
		const { data } = await this.post<IInferenceResponse<T>>(
			"/api/v1/sdk/sync/push",
			parameter
		);
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
		const { data } = await this.request<MtlabInferenceData<T>>({
			method: "POST",
			baseURL: this.openApiBaseUrl,
			...config,
		});
		this._mtxxErrorGuard(data?.ErrorCode);
		return data;
	}
}

export const client = new Client();
