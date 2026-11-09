import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURES } from "../../tools/fixture-manifest";
import { verifyFixtures } from "../../tools/fixture-verify";

const FIXTURES_DIR = join(__dirname, "..", "..", "fixtures");

describe("sandbox fixture contracts", () => {
	it("validates every fixture against its registered schema", () => {
		const report = verifyFixtures(FIXTURES_DIR);

		expect(
			report.failures.map((failure) => ({
				name: failure.name,
				outcome: failure.outcome,
				error: failure.error,
			}))
		).toEqual([]);
	});

	it("accounts for every fixture in the manifest", () => {
		const report = verifyFixtures(FIXTURES_DIR);

		expect(report.results.map((result) => result.name).sort()).toEqual(
			Object.keys(FIXTURES).sort()
		);
	});

	it("keeps at least the Phase 0 fixture floor", () => {
		expect(Object.keys(FIXTURES).length).toBeGreaterThanOrEqual(25);
	});

	it("contains no credentials, tokens or signed URLs", () => {
		const offenders: string[] = [];

		for (const name of Object.keys(FIXTURES)) {
			const raw = readFileSync(
				join(FIXTURES_DIR, `${name}.json`),
				"utf8"
			);

			if (/SB-Mid-(?:server|client)-/.test(raw)) {
				offenders.push(`${name}: server/client key`);
			}
			if (
				/OSSAccessKeyId|security-token|X-Amz-Signature|Signature=/.test(
					raw
				)
			) {
				offenders.push(`${name}: signed URL`);
			}
			if (/"signature_key":\s*"(?!0{128}")/.test(raw)) {
				offenders.push(`${name}: unredacted signature_key`);
			}
		}

		expect(offenders).toEqual([]);
	});
});
