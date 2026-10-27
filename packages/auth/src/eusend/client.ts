import {
	Eusend,
	type SendEmailOptions,
	type SendEmailResponse,
} from "@eusend_dev/sdk";
import type { EusendClientOptions } from "./types";

/**
 * wrapper around the `@eusend_dev/sdk` client.
 */
export class EusendClient {
	private readonly options: EusendClientOptions;
	private sdkInstance: Eusend | null = null;

	constructor(options: EusendClientOptions = {}) {
		this.options = options;
	}

	/**
	 * Retrieves or lazily creates the initialized Eusend SDK instance.
	 * Guards against missing API keys with clear error messages.
	 */
	public getSdk(): Eusend {
		if (this.sdkInstance) {
			return this.sdkInstance;
		}

		const apiKey =
			this.options.apiKey ??
			(typeof process !== "undefined"
				? (process.env as Record<string, string | undefined>)[
						"EUSEND_API_KEY"
					]
				: undefined);

		if (!apiKey) {
			throw new Error(
				"[Eusend] Missing API key. Please provide 'apiKey' in client options or set the 'EUSEND_API_KEY' environment variable."
			);
		}

		this.sdkInstance = new Eusend(
			apiKey,
			this.options.baseUrl ? { baseUrl: this.options.baseUrl } : undefined
		);

		return this.sdkInstance;
	}

	/**
	 * Sends an email using the underlying Eusend SDK.
	 */
	public async send(payload: SendEmailOptions): Promise<SendEmailResponse> {
		const from = payload.from ?? this.options.from;
		if (!from) {
			throw new Error(
				"[Eusend] Sender email address is required. Provide 'from' in EusendClient options or in the send payload."
			);
		}

		const sdk = this.getSdk();
		const sendPromise = sdk.emails.send({
			from,
			to: payload.to,
			subject: payload.subject,
			html: payload.html,
			text: payload.text,
			replyTo: payload.replyTo,
			headers: payload.headers,
			trackClicks: false,
			tags: payload.tags,
		});

		if (this.options.waitUntil) {
			this.options.waitUntil(sendPromise);
		}

		const response = await sendPromise;

		if (response.error) {
			const recipient = Array.isArray(payload.to)
				? payload.to.join(", ")
				: payload.to;
			throw new Error(
				`[Eusend] Failed to send email to ${recipient}: ${response.error.message} (${response.error.name})`
			);
		}

		return response.data;
	}
}
