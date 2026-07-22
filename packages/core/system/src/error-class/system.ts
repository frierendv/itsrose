/**
 * Internal system error class
 *
 * @class SystemError
 * @extends {Error}
 */
export class SystemError extends Error {
	override readonly name = "SystemError" as const;
	/**
	 * Http status code
	 *
	 * @readonly
	 * @type {500} Internal error.
	 */
	declare readonly statusCode: 500;
	/**
	 * Creates an instance of {@linkcode SystemError}.
	 *
	 * @param {string} message
	 */
	constructor(message: string) {
		super(message);
		this.statusCode = 500;
	}
}
