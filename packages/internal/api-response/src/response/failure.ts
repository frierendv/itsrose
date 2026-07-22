import { ERROR_CODE } from "@itsrose/http-code";
import type { InternalAnyProps, ResponseProps } from "../types";
import { AbstractResponse } from "./abstract";
import { extractMeta, mergeMeta } from "./meta";

export class FailureResponse<
	T,
	Meta extends object = Record<string, never>,
> extends AbstractResponse<"failure", T, Meta> {
	constructor(props: ResponseProps<"failure", T, Meta>) {
		super();

		const { code = "UNKNOWN", errors, message, meta } = props;
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
			statusCode: fail.http_code,
		});
	}

	/**
	 * Creates a failure response.
	 *
	 * @public
	 * @template T
	 * @template {object} [Meta=InternalAnyProps]
	 * @param {ResponseProps<"failure", T, Meta>} props - The `response.<errors>` properties.
	 * @returns {FailureResponse<T, Meta>}
	 */
	public static create<T, Meta extends object = InternalAnyProps>(
		props: ResponseProps<"failure", T, Meta>
	): FailureResponse<T, Meta> {
		return new FailureResponse<T, Meta>(props);
	}
}
