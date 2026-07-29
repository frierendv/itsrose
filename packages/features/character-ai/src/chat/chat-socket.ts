import { ThirdPartyApiError } from "@itsrose/system";
import WebSocket from "ws";
import type { CAIClient } from "../client";
import type { IChatSendMessageResponse } from "../zod-schema/chat";

const CHAT_TIMEOUT_MS = 30_000;

export class ChatSocket {
	private socket?: WebSocket;
	public output: IChatSendMessageResponse | null = null;

	private resolveWait?: () => void;
	private rejectWait?: (error: Error) => void;
	private timeout?: NodeJS.Timeout;

	constructor(private readonly client: CAIClient) {}

	/** Exposed send method */
	public send<T>(obj: T) {
		if (!this.socket) {
			return Promise.reject(
				new ThirdPartyApiError("chat has not been created.", 400)
			);
		}
		return this.socket.send(JSON.stringify(obj));
	}
	public create() {
		this.cleanup();

		this.socket = new WebSocket(this.client.neoWssUrl, {
			headers: this.client.getHeaders(),
			secureOptions: 0,
			secureProtocol: "TLSv1_2_method",
		});

		this.socket.on("message", this.onMessage);
		this.socket.on("error", this.onError);
		this.socket.on("close", this.onClose);
	}

	public waitForOpen(): Promise<void> {
		if (!this.socket) {
			return Promise.reject(
				new ThirdPartyApiError("chat has not been created.", 400)
			);
		}
		if (this.socket.readyState === WebSocket.OPEN) {
			return Promise.resolve();
		}
		return new Promise((resolve, reject) => {
			this.resolveWait = resolve;
			this.rejectWait = reject;

			const onOpen = () => {
				cleanup();
				resolve();
			};
			const cleanup = () => {
				clearTimeout(this.timeout);
				this.socket?.removeListener("open", onOpen);
			};
			this.socket?.once("open", onOpen);
			this.timeout = setTimeout(() => {
				this.finish(new ThirdPartyApiError("Chat timed out.", 504));
			}, CHAT_TIMEOUT_MS);
		});
	}

	public waitForOutput(): Promise<void> {
		if (!this.socket) {
			return Promise.reject(
				new ThirdPartyApiError("chat has not been created.", 400)
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
				this.finish(new ThirdPartyApiError("Chat timed out.", 504));
			}, CHAT_TIMEOUT_MS);
		});
	}

	private readonly onMessage = (raw: WebSocket.RawData): void => {
		let data: any;

		try {
			data = JSON.parse(raw.toString());
			const { turn, command, generation_mode, context_stats } = data;
			if (command === "update_turn") {
				const candidate = turn.candidates[0];
				data = {
					chat_id: turn.turn_key.chat_id,
					candidates: turn.candidates,
					primary_candidate_id: candidate.primary_candidate_id,
					generation_mode,
					context_stats,
				};
				if (!candidate.is_final) {
					return;
				}
			} else if (command !== "neo_error") {
				return;
			}
			this.timeout?.refresh();
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
