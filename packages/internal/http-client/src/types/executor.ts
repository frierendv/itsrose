import type { HttpClientError } from "../errors";
import type { HttpConfig } from "./config";
import type { InferObjectValue } from "./internal";
import type { HttpResponse } from "./response";

/**
 * A function that handle, parse, and transform error responses.
 *
 * @template [TError=unknown] Normalized error type produced by the handler.
 * @template [TData=unknown] Shape of the raw error payload handed to the handler.
 */
export type ErrorHandler<TError = unknown, TData = unknown> = (
	data: TData,
	error: HttpClientError
) => TError | Promise<TError>;

/**
 * Infers the error return type from an {@linkcode HttpConfig}'s error handler.
 * Defaults to {@linkcode HttpClientError} if no custom handler is configured.
 */
// export type ExtractError<T extends HttpConfig> = T["onError"] extends (
// 	...args: any[]
// ) => infer R
// 	? Awaited<R>
// 	: HttpClientError;
export type ResolvesTError<T extends HttpConfig> =
	InferObjectValue<T, "onError"> extends (
		...args: never[]
	) => infer __Infered__
		? Awaited<__Infered__>
		: HttpClientError;

/**
 * Execution function signature produced by the HTTP executor pipeline.
 */
export type HttpExecutor<TData, TError = unknown> = (
	handler?: ErrorHandler<TError>
) => Promise<HttpResponse<TData, TError>>;
