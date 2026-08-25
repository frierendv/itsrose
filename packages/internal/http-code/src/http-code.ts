import { BUSINESS_ERROR, CLIENT_ERROR, SERVER_ERROR, SUCCESS } from "./code";

/** HTTP success codes map */
export { SUCCESS };
/** Client error codes map */
export { CLIENT_ERROR };
/** Server error codes map */
export { SERVER_ERROR };
/** Business logic error codes map */
export { BUSINESS_ERROR };

/** All API Success codes type */
export type SuccessCode = typeof SUCCESS_CODE;
/** All API Error codes type */
export type ErrorCode = typeof ERROR_CODE;

/** @internal */
export type BusinessErrorCode = typeof BUSINESS_ERROR;
/** @internal */
export type ClientErrorCode = typeof CLIENT_ERROR;
/** @internal */
export type ServerErrorCode = typeof SERVER_ERROR;

/** Combined map of all API error codes including client, server, and business errors */
export const ERROR_CODE = {
	...CLIENT_ERROR,
	...SERVER_ERROR,
	...BUSINESS_ERROR,
	UNKNOWN: {
		code: 3999,
		message: "An unknown error occurred",
		http_code: 500,
	},
} as const;

/**
 * Combined map of all successful API response status codes.
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
