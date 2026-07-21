import { ERROR_CODE } from "@itsrose/http-code";
import type { InternalAnyProps, IResponseProps } from "../types";
import { AbstractResponse } from "./abstract";
import { extractMeta, mergeMeta } from "./meta";

export class FailureResponse<
	T = InternalAnyProps,
	Meta extends object = Record<string, never>,
> extends AbstractResponse<"failure", T, Meta> {
	constructor(options: IResponseProps<"failure", T, Meta>) {
		super();

		const { code = "UNKNOWN", errors, message, meta } = options;
		const { payload, meta: extractedMeta } = extractMeta(errors);
		const fail = ERROR_CODE[code] ?? ERROR_CODE.UNKNOWN;
		const mergedMeta = mergeMeta(meta, extractedMeta);

		this.setState({
			ok: false,
			code: fail.code,
			message: message || fail.message,
			data: null,
			errors: payload,
			meta: mergedMeta,
			http_code: fail.http_code,
		});
	}

	/**
	 * Creates a failure response.
	 *
	 * @public
	 * @template T
	 * @template {object} [Meta=Record<string, never>]
	 * @param {IResponseProps<"failure", T, Meta>} options - The failure response properties.
	 * @returns {FailureResponse<T, Meta>}
	 */
	public static create<T, Meta extends object = Record<string, never>>(
		options: IResponseProps<"failure", T, Meta>
	): FailureResponse<T, Meta> {
		return new FailureResponse<T, Meta>(options);
	}
}
