#!/usr/bin/env node
/**
 * Local webhook receiver for capturing real Midtrans HTTP notifications.
 *
 * Midtrans posts notifications to a public URL, so the receiver has to be
 * exposed by a tunnel you control (`cloudflared tunnel --url http://localhost:8787`,
 * ngrok, …). This tool records every notification received and writes them to
 * disk so they can be reviewed, sanitized and turned into fixtures.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { join } from "node:path";

export interface ReceivedNotification {
	readonly path: string;
	readonly orderId?: string;
	readonly transactionStatus?: string;
	readonly payload: unknown;
	readonly receivedAt: string;
}

export interface WebhookReceiverOptions {
	readonly port?: number;
	readonly outputDir?: string;
	readonly pathPrefix?: string;
	readonly onNotification?: (notification: ReceivedNotification) => void;
}

export interface WebhookReceiver {
	readonly url: string;
	readonly received: ReceivedNotification[];
	readonly listening: Promise<void>;
	close(): Promise<void>;
}

function readBody(request: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		request.on("data", (chunk: Buffer) => {
			chunks.push(chunk);
		});
		request.on("end", () => {
			resolve(Buffer.concat(chunks).toString("utf8"));
		});
		request.on("error", reject);
	});
}

function readField(body: unknown, key: string): string | undefined {
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return undefined;
	}
	const value = (body as Record<string, unknown>)[key];
	return typeof value === "string" ? value : undefined;
}

export function startWebhookReceiver(
	options: WebhookReceiverOptions = {}
): WebhookReceiver {
	const { port = 8787, outputDir, pathPrefix, onNotification } = options;
	const received: ReceivedNotification[] = [];
	let sequence = 0;

	const server: Server = createServer((request, response) => {
		void (async () => {
			const path = request.url ?? "/";

			if (pathPrefix && !path.startsWith(pathPrefix)) {
				response.writeHead(404).end();
				return;
			}

			if (request.method !== "POST") {
				response.writeHead(200, {
					"Content-Type": "text/plain; charset=utf-8",
				});
				response.end("Midtrans webhook receiver is running");
				return;
			}

			const raw = await readBody(request);
			let payload: unknown = raw;
			try {
				payload = JSON.parse(raw) as unknown;
			} catch {
				// keep raw text
			}

			const notification: ReceivedNotification = {
				path,
				orderId: readField(payload, "order_id"),
				transactionStatus: readField(payload, "transaction_status"),
				payload,
				receivedAt: new Date().toISOString(),
			};

			received.push(notification);
			onNotification?.(notification);

			if (outputDir) {
				mkdirSync(outputDir, { recursive: true });
				const name = `${String(sequence++).padStart(3, "0")}-${
					notification.orderId ?? "unknown"
				}.json`;
				writeFileSync(
					join(outputDir, name),
					`${JSON.stringify(notification, null, "\t")}\n`
				);
			}

			response.writeHead(200, { "Content-Type": "application/json" });
			response.end("{}");
		})().catch(() => {
			if (!response.headersSent) {
				response.writeHead(500).end();
			}
		});
	});

	const listening = new Promise<void>((resolve) => {
		server.listen(port, "0.0.0.0", resolve);
	});

	return {
		url: `http://localhost:${port}`,
		received,
		listening,
		close: () =>
			new Promise<void>((resolve, reject) => {
				server.close((error) => {
					if (error) {
						reject(error);
						return;
					}
					resolve();
				});
			}),
	};
}

interface CliOptions {
	port: number;
	out?: string;
	prefix?: string;
}

function parseArgs(argv: readonly string[]): CliOptions {
	const options: CliOptions = { port: 8787 };
	for (let index = 0; index < argv.length; index++) {
		const argument = argv[index];
		if (argument === "--port" || argument === "-p") {
			options.port = Number(argv[++index]);
		} else if (argument === "--out" || argument === "-o") {
			options.out = argv[++index];
		} else if (argument === "--prefix") {
			options.prefix = argv[++index];
		}
	}
	return options;
}

async function main(): Promise<void> {
	const { port, out, prefix } = parseArgs(process.argv.slice(2));
	const receiver = startWebhookReceiver({
		port,
		outputDir: out,
		pathPrefix: prefix,
		onNotification: (notification) => {
			console.log(
				`[${notification.receivedAt}] ${notification.path} ` +
					`order=${notification.orderId ?? "-"} ` +
					`status=${notification.transactionStatus ?? "-"}`
			);
		},
	});

	await receiver.listening;

	console.log(`Midtrans webhook receiver listening on :${port}`);
	console.log(`  path filter : ${prefix ?? "(any path)"}`);
	console.log(`  output dir  : ${out ?? "(memory only)"}`);
	console.log("");
	console.log("Expose it with a tunnel you control, then use the URL as");
	console.log("`X-Override-Notification` (or `X-Append-Notification`):");
	console.log(`  cloudflared tunnel --url http://localhost:${port}`);
	console.log("");
	console.log("Press Ctrl+C to stop.");

	process.on("SIGINT", () => {
		void receiver.close().then(() => {
			console.log(
				`\nCaptured ${receiver.received.length} notification(s).`
			);
			process.exit(0);
		});
	});
}

const isDirectRun =
	process.argv[1] !== undefined &&
	/\/webhook-receiver\.(ts|mjs|js)$/.test(process.argv[1]);

if (isDirectRun) {
	main().catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	});
}
