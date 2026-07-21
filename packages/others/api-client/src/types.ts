import type {
	FilterKeys,
	HasRequiredKeys,
	OperationRequestBody,
	RequestBodyJSON,
	ResponseObjectMap,
} from "openapi-typescript-helpers";

/** @internal */
export type HttpMethod = "get" | "post" | "patch" | "put" | "delete";

/** @internal */
export type PathParams<T> = T extends { parameters: { path: infer P } }
	? P
	: never;
/** @internal */
export type QueryParams<T> = T extends { parameters: { query?: infer Q } }
	? Q
	: never;
/** @internal */
export type MaybeRequired<T, Fallback = object> =
	HasRequiredKeys<T> extends never
		? (T & Fallback) | undefined
		: T & Fallback;
/** @internal */
export type FORMLike<T> = FilterKeys<T, `${string}/form-${string}`>;
/** @internal **`multipart/form-data` request body type** */
export type RequestBodyFORM<PathMethod> = FORMLike<
	FilterKeys<OperationRequestBody<PathMethod>, "content">
>;
/** @internal */
export type URLFormLike<T> = FilterKeys<T, "application/x-www-form-urlencoded">;
/** @internal **`x-www-form-urlencoded` request body type** */
export type RequestBodyURLFORM<PathMethod> = URLFormLike<
	FilterKeys<OperationRequestBody<PathMethod>, "content">
>;
/** @internal */
export type PathRequestOp<Op> =
	PathParams<Op> extends never ? object : { pathParams: PathParams<Op> };
/** @internal */
export type QueryRequestOp<Op> =
	QueryParams<Op> extends never
		? object
		: HasRequiredKeys<QueryParams<Op>> extends never
			? { params?: QueryParams<Op> }
			: { params: QueryParams<Op> };
/** @internal */
export type JSONRequestOp<Op> =
	RequestBodyJSON<Op> extends never
		? object
		: undefined extends RequestBodyJSON<Op>
			? { data?: RequestBodyJSON<Op> }
			: {
					/** **`application/json` request body type** */
					data: RequestBodyJSON<Op>;
				};

/** @internal */
export type FormDataRequestOp<Op> =
	RequestBodyFORM<Op> extends never
		? object
		: {
				/** **`multipart/form-data` request body handler** */
				formHandler?: (
					data: RequestBodyFORM<Op>
				) => FormData | Promise<FormData>;
			} & (undefined extends RequestBodyFORM<Op>
				? { formData?: RequestBodyFORM<Op> }
				: {
						/** **`multipart/form-data` request body type** */
						formData: RequestBodyFORM<Op>;
					});
/** @internal */
export type URLFormRequestOp<Op> =
	RequestBodyURLFORM<Op> extends never
		? object
		: {
				/** **`x-www-form-urlencoded` request body handler** */
				formHandler?: (
					data: RequestBodyURLFORM<Op>
				) => URLSearchParams | Promise<URLSearchParams>;
			} & (undefined extends RequestBodyURLFORM<Op>
				? { form?: RequestBodyURLFORM<Op> }
				: {
						/** **`x-www-form-urlencoded` request body type** */
						form: RequestBodyURLFORM<Op>;
					});
/** @internal */
export type RequestOptions<Op> = PathRequestOp<Op> &
	QueryRequestOp<Op> &
	// One of these three types must be present, depending on the request body type
	(JSONRequestOp<Op> | FormDataRequestOp<Op> | URLFormRequestOp<Op>);
/** @internal */
export type ResponseJSON<T> = T extends {
	content: { "application/json": infer D };
}
	? D
	: never;
/** @internal */
export type AnyResponseData<Responses> = ResponseJSON<
	Responses[keyof Responses]
>;
/** @internal */
export type APIResponse<Op> = AnyResponseData<ResponseObjectMap<Op>>;
