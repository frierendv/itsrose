/**
 * Promotes a notification recorded by `tools/webhook-receiver.ts` into a
 * committed fixture.
 *
 * ```bash
 * pnpm --filter @itsrose/midtrans sandbox:webhook:promote \
 *   --from .webhook-inbox/000-WH-123.json \
 *   --name notification/transaction-card
 * ```
 *
 * The payload is sanitized with the same rules as every other fixture, and a
 * matching `_meta` block is written so `fixtures:verify` can validate it.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeFixtureBody } from "./sanitize";

const FIXTURES_DIR = fileURLToPath(new URL("../fixtures", import.meta.url));

interface RecordedNotification {
	readonly path?: string;
	readonly payload?: unknown;
	readonly receivedAt?: string;
}

interface PromoteOptions {
	readonly from: string;
	readonly name: string;
	/** Endpoint template recorded in `_meta`. */
	readonly endpoint?: string;
}

function parseArgs(argv: readonly string[]): PromoteOptions {
	let from: string | undefined;
	let name: string | undefined;
	let endpoint: string | undefined;

	for (let index = 0; index < argv.length; index++) {
		const argument = argv[index];
		if (argument === "--from" || argument === "-f") {
			from = argv[++index];
		} else if (argument === "--name" || argument === "-n") {
			name = argv[++index];
		} else if (argument === "--endpoint" || argument === "-e") {
			endpoint = argv[++index];
		}
	}

	if (!from || !name) {
		throw new Error(
			"Usage: sandbox:webhook:promote --from <recorded.json> --name <fixture/name> [--endpoint <template>]"
		);
	}

	return { from, name, endpoint };
}

function readRecorded(path: string): RecordedNotification {
	const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		throw new Error(`${path}: expected a recorded notification object`);
	}
	// Accept both the receiver file shape and a bare payload.
	if ("payload" in raw) {
		return raw as RecordedNotification;
	}
	return { payload: raw };
}

function main(): void {
	const { from, name, endpoint } = parseArgs(process.argv.slice(2));
	const recorded = readRecorded(from);

	if (recorded.payload === undefined) {
		throw new Error(`${from}: no payload found`);
	}

	const payload = {
		_meta: {
			name,
			endpoint: endpoint ?? `POST ${recorded.path ?? "/midtrans"}`,
			http_status: 200,
			captured_at: recorded.receivedAt ?? new Date().toISOString(),
			source: "midtrans-sandbox",
			sanitized: true,
		},
		body: sanitizeFixtureBody(recorded.payload),
	};

	const target = join(FIXTURES_DIR, `${name}.json`);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, `${JSON.stringify(payload, null, "\t")}\n`);

	console.log(`Wrote ${target}`);
	console.log(
		"Next: register it in tools/fixture-manifest.ts, then run fixtures:verify."
	);
}

main();
