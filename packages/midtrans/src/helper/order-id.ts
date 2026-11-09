import { createHash, randomBytes } from "node:crypto";

/**
 * Generates an opaque, human-readable Order ID.
 *
 * ```markdown
 * Format: ORD-YYYYMM-[4-char user hash]-[4-char random]
 * Example: ORD-202610-8F2B-9K42
 * ```
 */
export function generateOrderId<const Prefix extends string = "ORD">(
	userId: string,
	prefix = "ORD" as Prefix
): `${Prefix}-${string}-${string}-${string}` {
	const now = new Date();
	const yearMonth = now.toISOString().slice(0, 7).replace("-", ""); // "202610"

	// Derive a 4-character deterministic token from the userId
	const userSegment = createHash("sha256")
		.update(userId)
		.digest("hex")
		.slice(0, 4)
		.toUpperCase();

	// Crockford base32-safe charset - 4 characters of unambiguous entropy
	const charset = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
	const bytes = randomBytes(4);
	let randomSegment = "";
	for (let index = 0; index < 4; index++) {
		randomSegment += charset[bytes[index]! % charset.length];
	}

	return `${prefix}-${yearMonth}-${userSegment}-${randomSegment}`;
}
