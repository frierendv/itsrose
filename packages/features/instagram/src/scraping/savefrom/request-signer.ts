import crypto from "crypto";

/**
 * This is a hardcoded key; Extracted from savefrom.net.
 */
const HARDCODED_SIGN_KEY =
	"39a34169b1c42e25eabbba012e00cbe3f2ba3d7598682fe518fd112e1a914ece"; // noqa
/** The timestamp; Extracted from savefrom.net. */
const TS = 1763383763390;

export function createSignedRequest(sfUrl: string) {
	const timestamp = Date.now();
	const hash = crypto
		.createHash("sha256")
		.update(sfUrl + timestamp + HARDCODED_SIGN_KEY)
		.digest("hex");

	return {
		ts: String(timestamp),
		sf_url: sfUrl,
		_s: hash,
		_ts: String(TS),
		_tsc: "0",
	};
}
