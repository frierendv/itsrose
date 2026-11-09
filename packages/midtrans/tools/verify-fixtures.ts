import { fileURLToPath } from "node:url";
import { verifyFixtures, type FixtureOutcome } from "./fixture-verify";

const FIXTURES_DIR = fileURLToPath(new URL("../fixtures", import.meta.url));

const ICONS: Readonly<Record<FixtureOutcome, string>> = {
	pass: "✅",
	mismatch: "❌",
	knownMismatch: "⚠️ ",
	promoted: "✨",
	unmodeled: "◇ ",
	missing: "❌",
	unlisted: "❌",
	invalid: "❌",
};

function main(): void {
	const report = verifyFixtures(FIXTURES_DIR);

	for (const result of report.results) {
		const icon = ICONS[result.outcome];
		const suffix = result.note ? ` — ${result.note}` : "";
		console.log(`${icon} ${result.name} [${result.outcome}]${suffix}`);
		if (result.error) {
			const indented = result.error
				.split("\n")
				.map((line) => `   ${line}`)
				.join("\n");
			console.log(indented);
		}
	}

	const counts = report.results.reduce<Record<string, number>>(
		(accumulator, result) => {
			accumulator[result.outcome] =
				(accumulator[result.outcome] ?? 0) + 1;
			return accumulator;
		},
		{}
	);

	console.log("\nFixture summary:");
	for (const [outcome, count] of Object.entries(counts).sort()) {
		console.log(`  ${outcome}: ${count}`);
	}

	if (report.failures.length > 0) {
		console.error(
			`\n${report.failures.length} fixture(s) failed verification.`
		);
		process.exitCode = 1;
		return;
	}

	console.log(`\nAll ${report.results.length} fixtures are accounted for.`);
}

main();
