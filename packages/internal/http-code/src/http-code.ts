import { BUSINESS_ERROR, CLIENT_ERROR, SERVER_ERROR, SUCCESS } from "./code";

export { BUSINESS_ERROR, CLIENT_ERROR, SERVER_ERROR, SUCCESS };
/** All API Success codes */
export type SuccessCode = typeof SUCCESS_CODE;
/** All API Error codes */
export type ErrorCode = typeof ERROR_CODE;

/** @internal */
export type BusinessErrorCode = typeof BUSINESS_ERROR;
/** @internal */
export type ClientErrorCode = typeof CLIENT_ERROR;
/** @internal */
export type ServerErrorCode = typeof SERVER_ERROR;

/** @internal */
export const ERROR_CODE = {
	...CLIENT_ERROR,
	...SERVER_ERROR,
	...BUSINESS_ERROR,
	UNKNOWN: {
		code: 3000,
		message: "An unknown error occurred",
		http_code: 500,
	},
} as const;

/**
 * Alias for {@linkcode SUCCESS}
 * @internal
 */
export const SUCCESS_CODE = SUCCESS;

/** @internal */
export type ReservedCode = typeof ERROR_CODE & typeof SUCCESS;
/** @internal */
export type ReservedCodeKey = keyof ReservedCode;

/** All HTTP status codes used in the API responses */
export type HttpStatusCode = ReservedCode[ReservedCodeKey]["http_code"];
/** All codes used in the API responses */
export type APIResponseCode = ReservedCode[keyof ReservedCode]["code"];
