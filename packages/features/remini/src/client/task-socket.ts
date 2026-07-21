import { ThirdPartyApiError } from "@itsrose/system";
import WebSocket from "ws";
import type { Oracle } from "../oracle";
import type { ReminiTaskResponse } from "../types";
import { REMINI_WSS_BASE_URL } from "./config";

const TASK_TIMEOUT_MS = 30_000;

export class TaskSocket {
	private socket?: WebSocket;
	public output: ReminiTaskResponse | null = null;

	private resolveWait?: () => void;
	private rejectWait?: (error: Error) => void;
	private timeout?: NodeJS.Timeout;

	constructor(private readonly oracle: Oracle) {}

	public submit(taskId: string): void {
		this.cleanup();

		this.socket = new WebSocket(
			`${REMINI_WSS_BASE_URL}/v2/tasks/${taskId}`,
			{
				headers: this.oracle.getHeaders(),
				secureOptions: 0,
				secureProtocol: "TLSv1_2_method",
			}
		);

		this.socket.on("message", this.onMessage);
		this.socket.on("error", this.onError);
		this.socket.on("close", this.onClose);
	}

	public waitForOutput(): Promise<void> {
		if (!this.socket) {
			return Promise.reject(
				new ThirdPartyApiError("Task has not been submitted.", 400)
			);
		}

		// Already completed before waiting.
		if (this.output) {
			return Promise.resolve();
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

		this.output = data;
		this.finish();
	};

	private readonly onError = (error: Error): void => {
		this.finish(error);
	};

	private readonly onClose = (): void => {
		if (!this.output) {
			this.finish(
				new ThirdPartyApiError(
					"Task connection closed unexpectedly.",
					500
				)
			);
		}
	};

	private finish(error?: Error): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = undefined;
		}

		this.socket?.removeAllListeners();
		this.socket?.close();
		this.socket = undefined;

		if (error) {
			this.rejectWait?.(error);
		} else {
			this.resolveWait?.();
		}

		this.resolveWait = undefined;
		this.rejectWait = undefined;
	}

	private cleanup(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = undefined;
		}

		this.socket?.removeAllListeners();
		this.socket?.close();
		this.socket = undefined;
	}
}
