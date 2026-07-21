import crypto from "crypto";

/**
 * This is a hardcoded key; Extracted from videodropper.app
 */
const HARDCODED_SIGN_KEY = "qwertyuioplkjhgf"; // noqa

/**
 * videodropper expects hashed url to be sent in header
 * `{ "url": "<hashed_url>" }`
 *
 * @param uri - The url to be hashed
 * @returns An object containing the hashed url
 */
export function createSignedRequest(uri: string) {
	const cipher = crypto.createCipheriv(
		"aes-128-ecb",
		HARDCODED_SIGN_KEY,
		null
	);
	cipher.setAutoPadding(true);
	const hash = Buffer.concat([
		cipher.update(uri, "utf8"),
		cipher.final(),
	]).toString("hex");

	return { url: hash };
}
