import type { APIResponseCode, HttpStatusCode } from "@itsrose/http-code";
import type { IResponse, PickMeta, ResponseKind } from "../types";

/** @internal */
export type ResponseState<
	Kind extends ResponseKind,
	T,
	Meta extends object,
> = IResponse<Kind, T, Meta> & {
	code: APIResponseCode;
	statusCode: HttpStatusCode;
};

/** @internal */
export abstract class AbstractResponse<
	Kind extends ResponseKind,
	T = object,
	Meta extends object = PickMeta<T>,
> implements IResponse<Kind, T, Meta> {
	/**
	 * The HTTP status code associated with the response.
	 *
	 * This is determined by the specific success or error code
	 * used in the response, and is set when the response state is initialized.
	 */
	declare public statusCode: HttpStatusCode;

	declare public ok: IResponse<Kind, T, Meta>["ok"];
	declare public code: APIResponseCode;
	declare public message: string;
	declare public data: IResponse<Kind, T, Meta>["data"];
	declare public errors: IResponse<Kind, T, Meta>["errors"];
	declare public meta: IResponse<Kind, T, Meta>["meta"];

	protected constructor() {}

	protected setState(state: ResponseState<Kind, T, Meta>) {
		this.statusCode = state.statusCode;

		this.ok = state.ok;
		this.code = state.code;
		this.message = state.message;
		this.data = state.data;
		this.errors = state.errors;
		this.meta = state.meta;
	}

	/**
	 * Converts the API response instance into a plain JSON object.
	 *
	 * This is useful for serializing the response to be sent over the network.
	 * The resulting object includes all standard response fields: `ok`, `code`,
	 * `message`, `data`, `errors`, and `meta`.
	 */
	public toJSON(): IResponse<Kind, T, Meta> {
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
