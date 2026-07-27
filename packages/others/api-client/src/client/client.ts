import {
	createHttpClient,
	type HttpClient,
	type IHttpClientConfig,
} from "@itsrose/http-client";
import type { FilterKeys, PathsWithMethod } from "openapi-typescript-helpers";
import type { APIResponse, HttpMethod, RequestOptions } from "../types";
import { parseOptions } from "./utils";

/** @internal */
const ITSROSE_API_CLIENT = Symbol("ItsRoseAPIClient");

export interface IAPIClient<TPaths extends object> extends APIClient<TPaths> {
	[ITSROSE_API_CLIENT]: IterableIterator<[string, any]>;
}

/**
 * Type-safe OpenAPI client with path-aware request helpers.
 */
export class APIClient<Paths extends object> {
	constructor(private readonly client: HttpClient) {}

	private _request<
		Method extends HttpMethod,
		Path extends PathsWithMethod<Paths, Method> & string,
		Op extends FilterKeys<Paths[Path], Method>,
	>(method: Method, path: Path, options?: RequestOptions<Op>) {
		const { url, data, params, ...rest } = parseOptions(path, options);
		return this.client.request<APIResponse<Op>>({
			method,
			url,
			data,
			params,
			...rest,
		});
	}

	/**
	 * Perform a GET request to an API endpoint.
	 *
	 * @param path Endpoint route.
	 * @param options Query and path parameter options.
	 */
	public get<
		Path extends PathsWithMethod<Paths, "get"> & string,
		Op extends FilterKeys<Paths[Path], "get">,
	>(path: Path, options?: RequestOptions<Op>) {
		return this._request("get", path, options);
	}

	/**
	 * Perform a POST request to an API endpoint.
	 *
	 * @param path Endpoint route.
	 * @param options Request body, query, and path parameters.
	 */
	public post<
		Path extends PathsWithMethod<Paths, "post"> & string,
		Op extends FilterKeys<Paths[Path], "post">,
	>(path: Path, options?: RequestOptions<Op>) {
		return this._request("post", path, options);
	}

	/**
	 * Perform a PUT request to an API endpoint.
	 *
	 * @param path Endpoint route.
	 * @param options Request body, query, and path parameters.
	 */
	public put<
		Path extends PathsWithMethod<Paths, "put"> & string,
		Op extends FilterKeys<Paths[Path], "put">,
	>(path: Path, options?: RequestOptions<Op>) {
		return this._request("put", path, options);
	}

	/**
	 * Perform a PATCH request to an API endpoint.
	 *
	 * @param path Endpoint route.
	 * @param options Request body, query, and path parameters.
	 */
	public patch<
		Path extends PathsWithMethod<Paths, "patch"> & string,
		Op extends FilterKeys<Paths[Path], "patch">,
	>(path: Path, options?: RequestOptions<Op>) {
		return this._request("patch", path, options);
	}

	/**
	 * Perform a DELETE request to an API endpoint.
	 *
	 * @param path Endpoint route.
	 * @param options Query and path parameter options.
	 */
	public delete<
		Path extends PathsWithMethod<Paths, "delete"> & string,
		Op extends FilterKeys<Paths[Path], "delete">,
	>(path: Path, options?: RequestOptions<Op>) {
		return this._request("delete", path, options);
	}
}

/**
 * Concrete type-safe ItsRose API Client instance initialized with custom client configuration.
 *
 * @template TPaths OpenAPI paths definition interface.
 */
export class ItsRoseAPIClient<TPaths extends object> extends APIClient<TPaths> {
	/**
	 * Creates an instance of {@linkcode ItsRoseAPIClient}.
	 *
	 * @param config HTTP client options including baseURL and headers.
	 */
	constructor(public readonly config: IHttpClientConfig) {
		super(createHttpClient(config));
	}
}
