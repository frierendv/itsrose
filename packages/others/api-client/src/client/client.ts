import { HttpClient } from "@itsrose/http-client";
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
export class APIClient<Paths extends object> extends HttpClient {
	private _request<
		Method extends HttpMethod,
		Path extends PathsWithMethod<Paths, Method> & string,
		Op extends FilterKeys<Paths[Path], Method>,
	>(method: Method, path: Path, options?: RequestOptions<Op>) {
		const normalize = parseOptions(path, options);
		return super.request<APIResponse<Op>>({
			...normalize,
			method,
		});
	}

	/**
	 * Perform a GET request to an API endpoint.
	 *
	 * @param path Endpoint route.
	 * @param options Query and path parameter options.
	 */
	public GET<
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
	public POST<
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
	public PUT<
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
	public PATCH<
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
	public DELETE<
		Path extends PathsWithMethod<Paths, "delete"> & string,
		Op extends FilterKeys<Paths[Path], "delete">,
	>(path: Path, options?: RequestOptions<Op>) {
		return this._request("delete", path, options);
	}
}
