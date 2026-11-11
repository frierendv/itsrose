import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebhookPayloadSchema } from "../../src/schema";
import { startWebhookReceiver } from "../../tools/webhook-receiver";

function freePort(): number {
	return 20_000 + Math.floor(Math.random() * 20_000);
}

async function waitFor(
	predicate: () => boolean,
	timeoutMs = 5000
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (predicate()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
	throw new Error("timed out waiting for the webhook receiver");
}

describe("webhook receiver", () => {
	it("records JSON notifications and acknowledges them", async () => {
		const port = freePort();
		const receiver = startWebhookReceiver({ port });

		try {
			await receiver.listening;

			const payload = {
				order_id: "ORDER-1",
				status_code: "200",
				transaction_status: "settlement",
				gross_amount: "15000.00",
				signature_key: "0".repeat(128),
			};

			const response = await fetch(`${receiver.url}/midtrans`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			expect(response.status).toBe(200);
			await waitFor(() => receiver.received.length === 1);

			expect(receiver.received[0]).toMatchObject({
				path: "/midtrans",
				orderId: "ORDER-1",
				transactionStatus: "settlement",
				payload,
			});
		} finally {
			await receiver.close();
		}
	});

	it("persists notifications to disk", async () => {
		const port = freePort();
		const outputDir = mkdtempSync(join(tmpdir(), "midtrans-webhook-"));
		const receiver = startWebhookReceiver({ port, outputDir });

		try {
			await receiver.listening;

			await fetch(`${receiver.url}/midtrans`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ order_id: "ORDER-2" }),
			});
			await waitFor(() => receiver.received.length === 1);

			const files = readdirSync(outputDir);
			expect(files).toHaveLength(1);

			const stored = JSON.parse(
				readFileSync(join(outputDir, files[0]!), "utf8")
			) as { orderId?: string };
			expect(stored.orderId).toBe("ORDER-2");
		} finally {
			await receiver.close();
			rmSync(outputDir, { recursive: true, force: true });
		}
	});

	it("ignores paths outside the configured prefix", async () => {
		const port = freePort();
		const receiver = startWebhookReceiver({
			port,
			pathPrefix: "/midtrans",
		});

		try {
			await receiver.listening;

			const response = await fetch(`${receiver.url}/other`, {
				method: "POST",
				body: "{}",
			});

			expect(response.status).toBe(404);
			expect(receiver.received).toHaveLength(0);
		} finally {
			await receiver.close();
		}
	});

	it("accepts non-JSON bodies without throwing", async () => {
		const port = freePort();
		const receiver = startWebhookReceiver({ port });

		try {
			await receiver.listening;

			const response = await fetch(`${receiver.url}/midtrans`, {
				method: "POST",
				body: "not-json",
			});

			expect(response.status).toBe(200);
			await waitFor(() => receiver.received.length === 1);
			expect(receiver.received[0]?.payload).toBe("not-json");
		} finally {
			await receiver.close();
		}
	});
});

describe("notification contract from captured fixtures", () => {
	it("parses a settled card status response as a notification", () => {
		const fixture = JSON.parse(
			readFileSync(
				join(
					__dirname,
					"..",
					"..",
					"fixtures",
					"core",
					"charge-credit-card.json"
				),
				"utf8"
			)
		) as { body: Record<string, unknown> };

		// A real notification mirrors the status response plus `signature_key`.
		const notification = {
			...fixture.body,
			signature_key: "0".repeat(128),
		};

		const parsed = WebhookPayloadSchema.safeParse(notification);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.payment_type).toBe("credit_card");
			expect(parsed.data.masked_card).toBeTruthy();
		}
	});
});
