import type { ErrorCode, SuccessCode } from "@itsrose/http-code";

/** @internal */
export type ResponseKind = "failure" | "success";

/** @internal */
export type InternalAnyProps<P = unknown> = Record<string, P>;

/** @internal */
export type PickMeta<T> = T extends { meta: infer Meta }
	? Meta extends object
		? Meta
		: InternalAnyProps<never>
	: InternalAnyProps<never>;

/** @internal */
export type OmitMeta<T> = T extends { meta: infer _M }
	? { [P in Exclude<keyof T, "meta">]: T[P] }
	: T;

/**
 * Merges two object types A and B into a flattened composite type.
 *
 * @template A First object type.
 * @template B Second object type.
 */
export type Merge<A, B> = { [K in keyof (A & B)]: (A & B)[K] } & {};

/**
 * Options for constructing an API response.
 *
 * @template Kind Response category ("success" or "failure").
 * @template T Payload data type.
 * @template Meta Metadata dictionary type.
 */
export type ResponseProps<
	Kind extends ResponseKind,
	T = InternalAnyProps,
	Meta extends object = InternalAnyProps,
> = {
	message?: string;
	meta?: Meta;
	code?: keyof (Kind extends "success" ? SuccessCode : ErrorCode);
} & (Kind extends "success"
	? { data: NonNullable<T> }
	: { errors: NonNullable<T> });

/**
 * Standardized API response object structure.
 *
 * @template Kind Response category ("success" or "failure").
 * @template T Payload data or errors type.
 * @template Meta Metadata dictionary type.
 */
export interface IResponse<
	Kind extends ResponseKind,
	T = InternalAnyProps,
	Meta extends object = InternalAnyProps,
> {
	/**
	 * Property `ok` is always `true` on success response, and `false` on failure response.
	 *
	 * @type {Kind extends "success" ? true : false}
	 */
	ok: Kind extends "success" ? true : false;
	/**
	 * Actual response code number.
	 *
	 * @type {number}
	 */
	code: number;
	/**
	 * Response message.
	 *
	 * @type {string}
	 */
	message: string;
	/**
	 * Data payload object. Always `null` on failure response.
	 *
	 * @type {Kind extends "success" ? OmitMeta<T> : null}
	 */
	data: Kind extends "success" ? OmitMeta<T> : null;
	/**
	 * Error payload object. Always `null` on success response.
	 *
	 * @type {Kind extends "failure" ? OmitMeta<T> : null}
	 */
	errors: Kind extends "failure" ? OmitMeta<T> : null;
	/**
	 * Additional metadata merged with _`<data | errors>.meta`_ property if present.
	 *
	 * @type {(Meta & PickMeta<T>)}
	 * @default {}
	 */
	meta: Merge<Meta, PickMeta<T>>;
}

/**
 * Union type for any API response construction options (success or failure).
 *
 * @template T Payload data or errors type.
 * @template Meta Metadata dictionary type.
 */
export type AnyResponseProps<T, Meta extends object> =
	ResponseProps<"failure", T, Meta> | ResponseProps<"success", T, Meta>;

/**
 * Union type for any standardized API response object (success or failure).
 *
 * @template T Payload data or errors type.
 * @template Meta Metadata dictionary type.
 */
export type AnyResponse<T, Meta extends object> =
	IResponse<"failure", T, Meta> | IResponse<"success", T, Meta>;
