import crypto from "node:crypto";

/**
 * Create new AID _(fn name based on remini oracle logic)_
 * @export
 * @returns {string}
 */
export function createAIdContext(): string {
	const hex = "0123456789abcdef";
	const randomBytes = crypto.randomBytes(16);
	let context = "";

	for (let i = 0; i < randomBytes.length; i++) {
		// not undefined.
		context += hex[randomBytes[i]! % hex.length];
	}

	return context;
}
