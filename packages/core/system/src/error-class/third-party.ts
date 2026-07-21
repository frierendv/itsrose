/**
 * Third-party API error class
 *
 * @class ThirdPartyApiError
 * @extends {Error}
 */
export class ThirdPartyApiError extends Error {
	/**
	 * Http status code
	 *
	 * @readonly
	 * @type {number}
	 */
	declare readonly statusCode: number;
	/**
	 * Creates an instance of ThirdPartyApiError.
	 *
	 * @param {string} message
	 * @param {number} statusCode
	 */
	constructor(message: string, statusCode: number) {
		super(message);
		this.name = "ThirdPartyApiError";
		this.statusCode = statusCode;
	}
}
