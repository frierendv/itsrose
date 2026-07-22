/**
 * Third-party API error class
 *
 * @class ThirdPartyApiError
 * @extends {Error}
 */
export class ThirdPartyApiError extends Error {
	override readonly name = "ThirdPartyApiError" as const;
	/**
	 * Http status code
	 *
	 * @readonly
	 * @type {number}
	 */
	declare readonly statusCode: number;
	/**
	 * Creates an instance of {@linkcode ThirdPartyApiError}.
	 *
	 * @param {string} message
	 * @param {number} statusCode
	 */
	constructor(message: string, statusCode: number) {
		super(message);
		this.statusCode = statusCode;
	}
}
