import type { ErrorCode, SuccessCode } from "@itsrose/http-code";

/** @internal */
export type ResponseKind = "failure" | "success";

/** @internal */
export type InternalAnyProps<P = unknown> = Record<string, P>;

/** @internal */
export type PickMeta<T> = T extends { meta: infer M }
	? M extends object
		? M
		: InternalAnyProps<never>
	: InternalAnyProps<never>;

/** @internal */
export type OmitMeta<T> = T extends { meta: infer _M } ? Omit<T, "meta"> : T;

export interface IResponseProps<
	Type extends ResponseKind,
	T = object,
	Meta extends object = InternalAnyProps,
> extends InternalAnyProps {
	data?: Type extends "success" ? T : null;
	errors?: Type extends "failure" ? T : null;
	message?: string;
	meta?: Meta;
	code?: keyof (Type extends "success" ? SuccessCode : ErrorCode);
}

export interface IResponse<
	Type extends ResponseKind,
	T = object,
	Meta extends object = InternalAnyProps,
> {
	/**
	 * Property `ok` always `true` on success response.
	 *
	 * @type {Type extends "success" ? true : false}
	 */
	ok: Type extends "success" ? true : false;
	/**
	 * Given response code.
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
	 * @type {Type extends "success" ? OmitMeta<T> : null}
	 */
	data: Type extends "success" ? OmitMeta<T> : null;
	/**
	 * Property `errors` always `null` on success response.
	 *
	 * @type {Type extends "failure" ? OmitMeta<T> : null}
	 */
	errors: Type extends "failure" ? OmitMeta<T> : null;
	/**
	 * Omited `meta` from `data` or `errors` property.
	 *
	 * @type {(Meta & PickMeta<T>)}
	 * @default {}
	 */
	meta: Meta & PickMeta<T>;
}
