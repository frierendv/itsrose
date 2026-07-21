/**
 * Invalid-request error class
 *
 * @class InvalidRequestError
 * @extends {Error}
 */
export class InvalidRequestError extends Error {
	/**
	 * Http status code
	 *
	 * @readonly
	 * @type {number}
	 */
	declare readonly statusCode: number;
	/**
	 * Creates an instance of InvalidRequestError.
	 *
	 * @param {string} message
	 */
	constructor(message: string) {
		super(message);
		this.name = "InvalidRequestError";
		/** Bad request */
		this.statusCode = 400;
	}
}
