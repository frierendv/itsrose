import { ThirdPartyApiError } from "@itsrose/system";
import WebSocket from "ws";
import type { Client } from "../client";
import type { ChatSendMessageResponse } from "../zod-schema";

const CHAT_TIMEOUT_MS = 30_000;

interface IIncomingCandidate {
	candidate_id?: string;
	raw_content?: string;
	is_final?: boolean;
	primary_candidate_id?: string;
	model_type?: string;
}

interface IIncomingTurn {
	turn_key?: {
		chat_id?: string;
		turn_id?: string;
	};
	candidates?: IIncomingCandidate[];
}

interface IIncomingMessage {
	command?: string;
	turn?: IIncomingTurn;
	generation_mode?: Record<string, unknown>;
	context_stats?: Record<string, unknown>;
	comment?: string;
}

export class ChatSocket {
	private socket?: WebSocket;
	public output: ChatSendMessageResponse | null = null;

	private resolveWait?: () => void;
	private rejectWait?: (error: Error) => void;
	private timeout?: NodeJS.Timeout;

	constructor(private readonly client: Client) {}

	/** Exposed send method */
	public send<T>(obj: T): Promise<void> {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			return Promise.reject(
				new ThirdPartyApiError("chat has not been created.", 400)
			);
		}

		return new Promise((resolve, reject) => {
			this.socket?.send(JSON.stringify(obj), (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	public create(): void {
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
			const onOpen = () => {
				cleanup();
				resolve();
			};
			const onError = (err: Error) => {
				cleanup();
				reject(err);
			};
			const onClose = () => {
				cleanup();
				reject(
					new ThirdPartyApiError(
						"Task connection closed unexpectedly before opening.",
						500
					)
				);
			};

			const cleanup = () => {
				this.clearTimeoutTimer();
				this.socket?.removeListener("open", onOpen);
				this.socket?.removeListener("error", onError);
				this.socket?.removeListener("close", onClose);
			};

			this.socket?.once("open", onOpen);
			this.socket?.once("error", onError);
			this.socket?.once("close", onClose);

			this.startTimeoutTimer(() => {
				cleanup();
				this.finish(new ThirdPartyApiError("Chat timed out.", 504));
				reject(new ThirdPartyApiError("Chat timed out.", 504));
			});
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

			this.startTimeoutTimer(() => {
				this.finish(new ThirdPartyApiError("Chat timed out.", 504));
			});
		});
	}

	private readonly onMessage = (raw: WebSocket.RawData): void => {
		let data: IIncomingMessage;

		try {
			data = JSON.parse(raw.toString());
		} catch {
			return;
		}

		const { turn, command, generation_mode, context_stats, comment } = data;

		if (command === "update_turn") {
			if (!turn?.candidates || turn.candidates.length === 0) {
				return;
			}
			const candidate = turn.candidates[0];

			// Received turn candidate frame; refresh inactivity timeout
			this.resetTimeoutTimer();

			if (!candidate?.is_final) {
				return;
			}

			const chatId = turn.turn_key?.chat_id;
			if (!chatId) {
				return;
			}

			this.output = {
				chat_id: chatId,
				candidates:
					turn.candidates as ChatSendMessageResponse["candidates"],
				generation_mode: (generation_mode ??
					{}) as ChatSendMessageResponse["generation_mode"],
				context_stats: (context_stats ??
					{}) as ChatSendMessageResponse["context_stats"],
			};
			this.finish();
		} else if (command === "neo_error") {
			this.finish(
				new ThirdPartyApiError(
					comment || "Character AI WebSocket error",
					500
				)
			);
		}
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
		this.clearTimeoutTimer();

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
		this.clearTimeoutTimer();

		this.socket?.removeAllListeners();
		this.socket?.close();
		this.socket = undefined;

		this.resolveWait = undefined;
		this.rejectWait = undefined;
	}

	private clearTimeoutTimer(): void {
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = undefined;
		}
	}

	private startTimeoutTimer(onTimeout?: () => void): void {
		this.clearTimeoutTimer();
		this.timeout = setTimeout(() => {
			if (onTimeout) {
				onTimeout();
			} else {
				this.finish(new ThirdPartyApiError("Chat timed out.", 504));
			}
		}, CHAT_TIMEOUT_MS);
	}

	private resetTimeoutTimer(): void {
		if (this.timeout) {
			this.timeout.refresh();
		}
	}
}
