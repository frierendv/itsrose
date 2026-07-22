import { SUCCESS_CODE } from "@itsrose/http-code";
import type { InternalAnyProps, ResponseProps } from "../types";
import { AbstractResponse } from "./abstract";
import { extractMeta, mergeMeta } from "./meta";

export class SuccessResponse<
	T,
	Meta extends object = Record<string, never>,
> extends AbstractResponse<"success", T, Meta> {
	constructor(props: ResponseProps<"success", T, Meta>) {
		super();

		const { code = "OK", data, message, meta } = props;
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
			statusCode: success.http_code,
		});
	}

	/**
	 * Creates a success response.
	 *
	 * @public
	 * @template T
	 * @template {object} [Meta=InternalAnyProps]
	 * @param {ResponseProps<"success", T, Meta>} props - The `<success>` response properties.
	 * @returns {SuccessResponse<T, Meta>}
	 */
	public static create<T, Meta extends object = InternalAnyProps>(
		props: ResponseProps<"success", T, Meta>
	): SuccessResponse<T, Meta> {
		return new SuccessResponse<T, Meta>(props);
	}
}
