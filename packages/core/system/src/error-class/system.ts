/**
 * Internal system error class
 *
 * @class SystemError
 * @extends {Error}
 */
export class SystemError extends Error {
	/**
	 * Http status code
	 *
	 * @readonly
	 * @type {number}
	 */
	declare readonly statusCode: number;
	/**
	 * Creates an instance of SystemError.
	 *
	 * @param {string} message
	 */
	constructor(message: string) {
		super(message);
		this.name = "SystemError";
		this.statusCode = 500;
	}
}
