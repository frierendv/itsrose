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

export type Merge<A, B> = { [K in keyof (A & B)]: (A & B)[K] } & {};

export type ResponseProps<
	Kind extends ResponseKind,
	T = InternalAnyProps,
	Meta extends object = InternalAnyProps,
> = {
	message?: string;
	meta?: Meta;
	code?: keyof (Kind extends "success" ? SuccessCode : ErrorCode);
} & (Kind extends "success" ? { data: T } : { errors: T });

export interface IResponse<
	Kind extends ResponseKind,
	T = InternalAnyProps,
	Meta extends object = InternalAnyProps,
> {
	/**
	 * Property `ok` always `true` on success response.
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
	 * Property `data` always `null` on failure response.
	 *
	 * **Note**: `meta` property in `object.<data>` is disallowed.
	 * All object from `meta` moved to root `object.<meta>`
	 *
	 * @type {Kind extends "success" ? OmitMeta<T> : null}
	 */
	data: Kind extends "success" ? OmitMeta<T> : null;
	/**
	 * Property `errors` always `null` on success response.
	 *
	 * **Note**: `meta` property in `object.<errors>` is disallowed.
	 * All object from `meta` moved to root `object.<meta>`
	 *
	 * @type {Kind extends "failure" ? OmitMeta<T> : null}
	 */
	errors: Kind extends "failure" ? OmitMeta<T> : null;
	/**
	 * Additional metadata merged with _`<data | errors>.meta`_ property if exist.
	 *
	 * @type {(Meta & PickMeta<T>)}
	 * @default {}
	 */
	meta: Merge<Meta, PickMeta<T>>;
}

export type AnyResponseProps<T, Meta extends object> =
	ResponseProps<"failure", T, Meta> | ResponseProps<"success", T, Meta>;

export type AnyResponse<T, Meta extends object> =
	IResponse<"failure", T, Meta> | IResponse<"success", T, Meta>;
