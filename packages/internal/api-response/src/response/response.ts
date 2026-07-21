import { ERROR_CODE, SUCCESS_CODE } from "@itsrose/http-code";
import type { IResponse, IResponseProps } from "../types";
import { FailureResponse } from "./failure";
import { SuccessResponse } from "./success";

/**
 *
 * @param response
 * @returns
 */
const create = <T = object, Meta extends object = Record<string, never>>(
	response:
		IResponseProps<"failure", T, Meta> | IResponseProps<"success", T, Meta>
): IResponse<"failure", T, Meta> | IResponse<"success", T, Meta> => {
	/**
	 * First, attempt to determine response type based on "code" property if present
	 *
	 * The `code` should be keyof {@link SUCCESS_CODE} or {@link ERROR_CODE}.
	 */
	if (response?.code) {
		const responseCode = response.code;

		if (responseCode in SUCCESS_CODE) {
			return SuccessResponse.create<T, Meta>(
				response as IResponseProps<"success", T, Meta>
			);
		}
		if (responseCode in ERROR_CODE) {
			return FailureResponse.create<T, Meta>(
				response as IResponseProps<"failure", T, Meta>
			);
		}
	}

	/**
	 * Last resort: determine type based on presence of "errors" property
	 */
	return "errors" in response
		? FailureResponse.create<T, Meta>(
				response as IResponseProps<"failure", T, Meta>
			)
		: SuccessResponse.create<T, Meta>(
				response as IResponseProps<"success", T, Meta>
			);
};

create.success = SuccessResponse.create.bind(SuccessResponse);
create.failure = FailureResponse.create.bind(FailureResponse);
/**
 * Create http API Response
 */
export const createResponse = Object.freeze(create);
