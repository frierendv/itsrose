import type { APIResponseCode, HttpStatusCode } from "@itsrose/http-code";
import type { IResponse, PickMeta, ResponseKind } from "../types";

/** @internal */
export type ResponseState<
	Type extends ResponseKind,
	T,
	Meta extends object,
> = IResponse<Type, T, Meta> & {
	code: APIResponseCode;
	http_code: HttpStatusCode;
};

/** @internal */
export abstract class AbstractResponse<
	Type extends ResponseKind,
	T,
	Meta extends object = Record<string, never>,
> implements IResponse<Type, T, Meta> {
	declare public ok: IResponse<Type, T, Meta>["ok"];
	declare public code: APIResponseCode;
	declare public message: string;
	declare public data: IResponse<Type, T, Meta>["data"];
	declare public errors: IResponse<Type, T, Meta>["errors"];
	declare public meta: Meta & PickMeta<T>;

	declare protected http_code: HttpStatusCode;

	protected constructor() {}

	protected setState(state: ResponseState<Type, T, Meta>) {
		this.ok = state.ok;
		this.code = state.code;
		this.message = state.message;
		this.data = state.data;
		this.errors = state.errors;
		this.meta = state.meta;
		this.http_code = state.http_code;
	}

	/**
	 * Returns the HTTP status code associated with the response.
	 *
	 * This is determined by the specific success or error code
	 * used in the response, and is set when the response state is initialized.
	 */
	public get statusCode(): HttpStatusCode {
		return this.http_code;
	}

	/**
	 * Converts the API response instance into a plain JSON object.
	 *
	 * This is useful for serializing the response to be sent over the network.
	 * The resulting object includes all standard response fields: `ok`, `code`,
	 * `message`, `data`, `errors`, and `meta`.
	 */
	public toJSON(): IResponse<Type, T, Meta> {
		return {
			ok: this.ok,
			code: this.code,
			message: this.message,
			data: this.data,
			meta: this.meta,
			errors: this.errors,
		};
	}
}
