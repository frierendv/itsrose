import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WebhookPayloadSchema } from "../../src/schema";

const FIXTURES_DIR = join(__dirname, "..", "..", "fixtures");

function loadFixture(name: string): { body: unknown } {
	return JSON.parse(
		readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf8")
	) as { body: unknown };
}

describe("transaction notification contract", () => {
	it("parses a status response as a notification payload", () => {
		const fixture = loadFixture("core/status-pending");
		const parsed = WebhookPayloadSchema.safeParse(fixture.body);

		expect(parsed.success).toBe(true);
	});

	it("requires the signature key", () => {
		const fixture = loadFixture("core/status-pending");
		const body = { ...(fixture.body as Record<string, unknown>) };
		delete body.signature_key;

		expect(WebhookPayloadSchema.safeParse(body).success).toBe(false);
	});
});
