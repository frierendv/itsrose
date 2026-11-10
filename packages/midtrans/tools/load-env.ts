/**
 * Loads `packages/midtrans/.env.dev` into `process.env` if present.
 *
 * Used by sandbox CLI tools so they work both locally (with `.env.dev`) and
 * on CI (where credentials are injected via environment variables).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = join(__dirname, "..", ".env.dev");
if (existsSync(envFile)) {
	for (const line of readFileSync(envFile, "utf8").split("\n")) {
		const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
		if (match?.[1] && process.env[match[1]] === undefined) {
			process.env[match[1]] = match[2];
		}
	}
}
