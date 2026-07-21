import { SUCCESS_CODE } from "@itsrose/http-code";
import type { InternalAnyProps, IResponseProps } from "../types";
import { AbstractResponse } from "./abstract";
import { extractMeta, mergeMeta } from "./meta";

export class SuccessResponse<
	T = InternalAnyProps,
	Meta extends object = Record<string, never>,
> extends AbstractResponse<"success", T, Meta> {
	constructor(options: IResponseProps<"success", T, Meta>) {
		super();

		const { code = "OK", data, message, meta } = options;
		const { payload, meta: extractedMeta } = extractMeta(data);
		const success = SUCCESS_CODE[code] ?? SUCCESS_CODE.OK;
		const mergedMeta = mergeMeta(meta, extractedMeta);

		this.setState({
			ok: true,
			code: success.code,
			message: message || success.message,
			data: payload,
			errors: null,
			meta: mergedMeta,
			http_code: success.http_code,
		});
	}

	/**
	 * Creates a success response.
	 *
	 * @public
	 * @template T
	 * @template {object} [Meta=Record<string, never>]
	 * @param {IResponseProps<"success", T, Meta>} options - The response data properties.
	 * @returns {SuccessResponse<T, Meta>}
	 */
	public static create<T, Meta extends object = Record<string, never>>(
		options: IResponseProps<"success", T, Meta>
	): SuccessResponse<T, Meta> {
		return new SuccessResponse<T, Meta>(options);
	}
}
