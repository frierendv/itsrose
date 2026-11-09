import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { z } from "zod/v4";
import { FIXTURES, type FixtureExpectation } from "./fixture-manifest";

export type FixtureOutcome =
	| "pass"
	| "mismatch"
	| "knownMismatch"
	| "promoted"
	| "unmodeled"
	| "missing"
	| "unlisted"
	| "invalid";

export interface FixtureResult {
	readonly name: string;
	readonly expectation: FixtureExpectation | "unlisted";
	readonly outcome: FixtureOutcome;
	readonly note?: string;
	readonly error?: string;
}

export interface VerifyReport {
	readonly results: readonly FixtureResult[];
	readonly failures: readonly FixtureResult[];
}

interface FixtureFile {
	readonly meta: Record<string, unknown>;
	readonly body: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function listFixtureNames(directory: string): string[] {
	const names: string[] = [];

	const walk = (current: string): void => {
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const fullPath = join(current, entry.name);
			if (entry.isDirectory()) {
				walk(fullPath);
				continue;
			}
			if (!entry.isFile() || !entry.name.endsWith(".json")) {
				continue;
			}
			names.push(
				relative(directory, fullPath)
					.split(sep)
					.join("/")
					.replace(/\.json$/, "")
			);
		}
	};

	walk(directory);
	names.sort();
	return names;
}

function readFixtureFile(fullPath: string): FixtureFile {
	const raw: unknown = JSON.parse(readFileSync(fullPath, "utf8"));
	if (!isRecord(raw) || !isRecord(raw._meta) || !("body" in raw)) {
		throw new Error(
			"fixture must be an object with a `_meta` object and a `body` key"
		);
	}
	return { meta: raw._meta, body: raw.body };
}

function validateMeta(meta: Record<string, unknown>): string[] {
	const problems: string[] = [];
	if (meta.source !== "midtrans-sandbox") {
		problems.push('`_meta.source` must be "midtrans-sandbox"');
	}
	if (meta.sanitized !== true) {
		problems.push("`_meta.sanitized` must be true");
	}
	if (typeof meta.endpoint !== "string") {
		problems.push("`_meta.endpoint` must be a string");
	}
	if (typeof meta.http_status !== "number") {
		problems.push("`_meta.http_status` must be a number");
	}
	if (typeof meta.captured_at !== "string") {
		problems.push("`_meta.captured_at` must be a string");
	}
	return problems;
}

function verifyFixture(
	fixturesDirectory: string,
	name: string,
	expectation: FixtureExpectation,
	schema: z.ZodType | null,
	note: string | undefined
): FixtureResult {
	const fullPath = join(fixturesDirectory, `${name}.json`);

	let fixture: FixtureFile;
	try {
		fixture = readFixtureFile(fullPath);
	} catch (error) {
		return {
			name,
			expectation,
			outcome: "missing",
			note,
			error:
				error instanceof Error
					? error.message
					: "unreadable fixture file",
		};
	}

	const metaProblems = validateMeta(fixture.meta);
	if (metaProblems.length > 0) {
		return {
			name,
			expectation,
			outcome: "invalid",
			note,
			error: metaProblems.join("; "),
		};
	}

	if (expectation === "unmodeled") {
		return { name, expectation, outcome: "unmodeled", note };
	}

	if (!schema) {
		return {
			name,
			expectation,
			outcome: "invalid",
			note,
			error: "a schema is required for mustPass/knownMismatch fixtures",
		};
	}

	const parsed = schema.safeParse(fixture.body);
	if (parsed.success) {
		return {
			name,
			expectation,
			outcome: expectation === "mustPass" ? "pass" : "promoted",
			note,
		};
	}

	return {
		name,
		expectation,
		outcome: expectation === "mustPass" ? "mismatch" : "knownMismatch",
		note,
		error: z.prettifyError(parsed.error),
	};
}

/**
 * Verifies every committed fixture against its registered schema.
 *
 * Runs completely offline: fixtures are the committed captures, and no
 * network request is performed.
 */
export function verifyFixtures(fixturesDirectory: string): VerifyReport {
	const names = listFixtureNames(fixturesDirectory);
	const results: FixtureResult[] = [];

	for (const name of names) {
		const definition = FIXTURES[name];
		if (!definition) {
			results.push({
				name,
				expectation: "unlisted",
				outcome: "unlisted",
				error: "fixture is not present in tools/fixture-manifest.ts",
			});
			continue;
		}
		results.push(
			verifyFixture(
				fixturesDirectory,
				name,
				definition.expectation,
				definition.schema,
				definition.note
			)
		);
	}

	for (const [name, definition] of Object.entries(FIXTURES)) {
		if (names.includes(name)) {
			continue;
		}
		results.push({
			name,
			expectation: definition.expectation,
			outcome: "missing",
			note: definition.note,
			error: "registered in the manifest but the fixture file is missing",
		});
	}

	results.sort((left, right) => left.name.localeCompare(right.name));

	const failures = results.filter(
		(result) =>
			result.outcome === "mismatch" ||
			result.outcome === "missing" ||
			result.outcome === "unlisted" ||
			result.outcome === "invalid"
	);

	return { results, failures };
}
