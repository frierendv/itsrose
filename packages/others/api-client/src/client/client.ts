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

	public get<
		Path extends PathsWithMethod<Paths, "get"> & string,
		Op extends FilterKeys<Paths[Path], "get">,
	>(path: Path, options?: RequestOptions<Op>) {
		return this._request("get", path, options);
	}
	public post<
		Path extends PathsWithMethod<Paths, "post"> & string,
		Op extends FilterKeys<Paths[Path], "post">,
	>(path: Path, options?: RequestOptions<Op>) {
		return this._request("post", path, options);
	}
	public put<
		Path extends PathsWithMethod<Paths, "put"> & string,
		Op extends FilterKeys<Paths[Path], "put">,
	>(path: Path, options?: RequestOptions<Op>) {
		return this._request("put", path, options);
	}
	public patch<
		Path extends PathsWithMethod<Paths, "patch"> & string,
		Op extends FilterKeys<Paths[Path], "patch">,
	>(path: Path, options?: RequestOptions<Op>) {
		return this._request("patch", path, options);
	}
	public delete<
		Path extends PathsWithMethod<Paths, "delete"> & string,
		Op extends FilterKeys<Paths[Path], "delete">,
	>(path: Path, options?: RequestOptions<Op>) {
		return this._request("delete", path, options);
	}
}

export class ItsRoseAPIClient<TPaths extends object> extends APIClient<TPaths> {
	constructor(public readonly config: IHttpClientConfig) {
		super(createHttpClient(config));
	}
}
