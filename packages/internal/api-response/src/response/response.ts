import { ERROR_CODE, SUCCESS_CODE } from "@itsrose/http-code";
import type {
	AnyResponse,
	AnyResponseProps,
	InternalAnyProps,
	ResponseProps,
} from "../types";
import { FailureResponse } from "./failure";
import { SuccessResponse } from "./success";

/**
 * Creates an HTTP API Response.
 * Automatically infers whether to create a {@linkcode SuccessResponse} or  {@linkcode FailureResponse}
 * based on the provided HTTP `code` or the presence of an `errors` object.
 *
 * @param props - Configuration payload and metadata for the response
 * @returns A structured SuccessResponse or FailureResponse instance
 */
const create = <T, Meta extends object = InternalAnyProps>(
	props: AnyResponseProps<T, Meta>
): AnyResponse<T, Meta> => {
	// Determine response type based on specific HTTP code
	if (props.code) {
		if (props.code in ERROR_CODE) {
			return FailureResponse.create<T, Meta>(
				props as ResponseProps<"failure", T, Meta>
			);
		}

		if (props.code in SUCCESS_CODE) {
			return SuccessResponse.create<T, Meta>(
				props as ResponseProps<"success", T, Meta>
			);
		}
	}

	// Determine type based on payload shape
	if ("errors" in props) {
		return FailureResponse.create<T, Meta>(
			props as ResponseProps<"failure", T, Meta>
		);
	}

	return SuccessResponse.create<T, Meta>(
		props as ResponseProps<"success", T, Meta>
	);
};

// Attach static factory methods
create.success = SuccessResponse.create.bind(SuccessResponse);
create.failure = FailureResponse.create.bind(FailureResponse);

export const createResponse = Object.freeze(create);
