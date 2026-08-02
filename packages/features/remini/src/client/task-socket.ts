import { ThirdPartyApiError } from "@itsrose/system";
import WebSocket from "ws";
import type { ReminiTaskResponse } from "../types";
import type { Client } from "./client";

const TASK_TIMEOUT_MS = 30_000;

export class TaskSocket {
	public output: ReminiTaskResponse | null = null;
	public error: Error | null = null;

	private socket?: WebSocket;
	private resolveWait?: () => void;
	private rejectWait?: (error: Error) => void;
	private timeout?: NodeJS.Timeout;

	constructor(private readonly client: Client) {}

	public submit(taskId: string): void {
		this.cleanup();
		this.output = null;
		this.error = null;

		this.socket = new WebSocket(
			`${this.client.wssBaseUrl}/v2/tasks/${taskId}`,
			{
				headers: this.client.oracle.getHeaders(),
				secureOptions: 0,
				secureProtocol: "TLSv1_2_method",
			}
		);

		this.socket.on("message", this.onMessage);
		this.socket.on("error", this.onError);
		this.socket.on("close", this.onClose);
	}

	public waitForOutput(): Promise<void> {
		// Already failed before waiting.
		if (this.error) {
			return Promise.reject(this.error);
		}

		// Already completed before waiting.
		if (this.output) {
			return Promise.resolve();
		}

		if (!this.socket) {
			return Promise.reject(
				new ThirdPartyApiError("Task has not been submitted.", 400)
			);
		}

		return new Promise((resolve, reject) => {
			this.resolveWait = resolve;
			this.rejectWait = reject;

			this.timeout = setTimeout(() => {
				this.finish(new ThirdPartyApiError("Task timed out.", 504));
			}, TASK_TIMEOUT_MS);
		});
	}

	private readonly onMessage = (raw: WebSocket.RawData): void => {
		let data: ReminiTaskResponse;

		try {
			data = JSON.parse(raw.toString());
		} catch {
			return;
		}

		if (data.status === "processing") {
			return;
		}

		this.output = data;
		this.finish();
	};

	private readonly onError = (error: Error): void => {
		this.finish(error);
	};

	private readonly onClose = (): void => {
		if (!this.output && !this.error) {
			this.finish(
				new ThirdPartyApiError(
					"Task connection closed unexpectedly.",
					500
				)
			);
		}
	};

	private finish(error?: Error): void {
		if (error) {
			this.error = error;
		}

		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = undefined;
		}

		if (this.socket) {
			const sock = this.socket;
			this.socket = undefined;
			sock.removeAllListeners();
			sock.on("error", () => {});
			sock.close();
		}

		const resolve = this.resolveWait;
		const reject = this.rejectWait;
		this.resolveWait = undefined;
		this.rejectWait = undefined;

		if (error) {
			reject?.(error);
		} else {
			resolve?.();
		}
	}

	private cleanup(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = undefined;
		}

		if (this.socket) {
			const sock = this.socket;
			this.socket = undefined;
			sock.removeAllListeners();
			sock.on("error", () => {});
			sock.close();
		}

		this.resolveWait = undefined;
		this.rejectWait = undefined;
	}
}
