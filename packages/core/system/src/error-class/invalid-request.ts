/**
 * Invalid-request error class
 *
 * @class InvalidRequestError
 * @extends {Error}
 */
export class InvalidRequestError extends Error {
	override readonly name = "InvalidRequestError" as const;
	/**
	 * Http status code
	 *
	 * @readonly
	 * @type {400} Bad request.
	 */
	declare readonly statusCode: 400;
	/**
	 * Creates an instance of {@linkcode InvalidRequestError}.
	 *
	 * @param {string} message
	 */
	constructor(message: string) {
		super(message);
		this.name = "InvalidRequestError";
		this.statusCode = 400;
	}
}
