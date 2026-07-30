import { EventEmitter } from "node:events";
import { ThirdPartyApiError } from "@itsrose/system";
import WebSocket from "ws";
import { ChatSocket } from "../src/chat/chat-socket";
import type { Client as CAIClient } from "../src/client";

jest.mock("ws");

class MockWebSocket extends EventEmitter {
	public readyState = WebSocket.CONNECTING;
	public send = jest.fn();
	public close = jest.fn();
}

describe("ChatSocket", () => {
	let mockClient: CAIClient;
	let mockWs: MockWebSocket;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useRealTimers();

		mockClient = {
			neoWssUrl: "wss://example.com/ws",
			getHeaders: jest
				.fn()
				.mockReturnValue({ Authorization: "Bearer token" }),
		} as unknown as CAIClient;

		mockWs = new MockWebSocket();
		(WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);
	});

	it("should reject send() when socket is not created", async () => {
		const chatSocket = new ChatSocket(mockClient);
		await expect(chatSocket.send({ foo: "bar" })).rejects.toThrow(
			ThirdPartyApiError
		);
	});

	it("should reject waitForOpen() when socket is not created", async () => {
		const chatSocket = new ChatSocket(mockClient);
		await expect(chatSocket.waitForOpen()).rejects.toThrow(
			ThirdPartyApiError
		);
	});

	it("should reject waitForOutput() when socket is not created", async () => {
		const chatSocket = new ChatSocket(mockClient);
		await expect(chatSocket.waitForOutput()).rejects.toThrow(
			ThirdPartyApiError
		);
	});

	it("should resolve waitForOpen() immediately if readyState is OPEN", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();
		(mockWs as any).readyState = WebSocket.OPEN;

		await expect(chatSocket.waitForOpen()).resolves.toBeUndefined();
	});

	it("should resolve waitForOpen() when open event fires", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		const waitPromise = chatSocket.waitForOpen();
		mockWs.emit("open");

		await expect(waitPromise).resolves.toBeUndefined();
	});

	it("should reject waitForOpen() when error event fires before open", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		const waitPromise = chatSocket.waitForOpen();
		mockWs.emit("error", new Error("connection failed"));

		await expect(waitPromise).rejects.toThrow("connection failed");
	});

	it("should reject waitForOpen() when close event fires before open", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		const waitPromise = chatSocket.waitForOpen();
		mockWs.emit("close");

		await expect(waitPromise).rejects.toThrow(
			"Task connection closed unexpectedly before opening."
		);
	});

	it("should reject waitForOpen() when timeout fires", async () => {
		jest.useFakeTimers();
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		const waitPromise = chatSocket.waitForOpen();
		jest.advanceTimersByTime(30_000);

		await expect(waitPromise).rejects.toThrow("Chat timed out.");
	});

	it("should send message via websocket when open", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();
		(mockWs as any).readyState = WebSocket.OPEN;

		mockWs.send.mockImplementation((_data: any, callback?: any) => {
			if (typeof callback === "function") {
				callback();
			}
			return true as any;
		});

		await expect(
			chatSocket.send({ command: "test" })
		).resolves.toBeUndefined();
		expect(mockWs.send).toHaveBeenCalledWith(
			JSON.stringify({ command: "test" }),
			expect.any(Function)
		);
	});

	it("should reject send() when websocket send returns an error", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();
		(mockWs as any).readyState = WebSocket.OPEN;

		mockWs.send.mockImplementation((_data: any, callback?: any) => {
			if (typeof callback === "function") {
				callback(new Error("socket send error"));
			}
			return true as any;
		});

		await expect(chatSocket.send({ command: "test" })).rejects.toThrow(
			"socket send error"
		);
	});

	it("should resolve waitForOutput() immediately if output is already available", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();
		chatSocket.output = {
			chat_id: "c-1",
			candidates: [],
			generation_mode: {},
			context_stats: {},
		};

		await expect(chatSocket.waitForOutput()).resolves.toBeUndefined();
	});

	it("should reject waitForOutput() on timeout", async () => {
		jest.useFakeTimers();
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		const outputPromise = chatSocket.waitForOutput();
		jest.advanceTimersByTime(30_000);

		await expect(outputPromise).rejects.toThrow("Chat timed out.");
	});

	it("should handle final turn message correctly", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		const outputPromise = chatSocket.waitForOutput();

		const turnMessage = {
			command: "update_turn",
			turn: {
				turn_key: { chat_id: "chat-123", turn_id: "turn-456" },
				candidates: [
					{
						candidate_id: "cand-1",
						raw_content: "Hello world",
						is_final: true,
					},
				],
			},
			generation_mode: {},
			context_stats: {},
		};

		mockWs.emit("message", Buffer.from(JSON.stringify(turnMessage)));

		await outputPromise;

		expect(chatSocket.output).toEqual({
			chat_id: "chat-123",
			candidates: turnMessage.turn.candidates,
			generation_mode: {},
			context_stats: {},
		});
	});

	it("should fallback generation_mode and context_stats when missing in turn message", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		const outputPromise = chatSocket.waitForOutput();

		const turnMessage = {
			command: "update_turn",
			turn: {
				turn_key: { chat_id: "chat-456" },
				candidates: [{ is_final: true }],
			},
		};

		mockWs.emit("message", Buffer.from(JSON.stringify(turnMessage)));

		await outputPromise;

		expect(chatSocket.output?.generation_mode).toEqual({});
		expect(chatSocket.output?.context_stats).toEqual({});
	});

	it("should ignore invalid json or irrelevant update_turn messages", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		// Invalid JSON
		mockWs.emit("message", Buffer.from("invalid json"));

		// update_turn with no candidates
		mockWs.emit(
			"message",
			Buffer.from(
				JSON.stringify({
					command: "update_turn",
					turn: { candidates: [] },
				})
			)
		);

		// update_turn with non-final candidate
		mockWs.emit(
			"message",
			Buffer.from(
				JSON.stringify({
					command: "update_turn",
					turn: { candidates: [{ is_final: false }] },
				})
			)
		);

		// update_turn with missing chat_id
		mockWs.emit(
			"message",
			Buffer.from(
				JSON.stringify({
					command: "update_turn",
					turn: { candidates: [{ is_final: true }], turn_key: {} },
				})
			)
		);

		expect(chatSocket.output).toBeNull();
	});

	it("should reject with ThirdPartyApiError on neo_error command", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		const outputPromise = chatSocket.waitForOutput();

		const errorMessage = {
			command: "neo_error",
			comment: "Character limit exceeded",
		};

		mockWs.emit("message", Buffer.from(JSON.stringify(errorMessage)));

		await expect(outputPromise).rejects.toThrow(ThirdPartyApiError);
	});

	it("should reject with default error message when neo_error comment is missing", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		const outputPromise = chatSocket.waitForOutput();

		mockWs.emit(
			"message",
			Buffer.from(JSON.stringify({ command: "neo_error" }))
		);

		await expect(outputPromise).rejects.toThrow(
			"Character AI WebSocket error"
		);
	});

	it("should reject waitForOutput() when socket emits error", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		const outputPromise = chatSocket.waitForOutput();
		mockWs.emit("error", new Error("Internal socket error"));

		await expect(outputPromise).rejects.toThrow("Internal socket error");
	});

	it("should reject waitForOutput() when socket closes before output", async () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		const outputPromise = chatSocket.waitForOutput();
		mockWs.emit("close");

		await expect(outputPromise).rejects.toThrow(
			"Task connection closed unexpectedly."
		);
	});

	it("should clean up existing socket when create() is called twice", () => {
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();
		const oldWs = mockWs;

		chatSocket.create();
		expect(oldWs.close).toHaveBeenCalled();
	});

	it("should handle startTimeoutTimer default callback and resetTimeoutTimer when timeout is missing", async () => {
		jest.useFakeTimers();
		const chatSocket = new ChatSocket(mockClient);
		chatSocket.create();

		const waitPromise = chatSocket.waitForOutput();
		(chatSocket as any).startTimeoutTimer();
		(chatSocket as any).resetTimeoutTimer();

		jest.advanceTimersByTime(30_000);
		await expect(waitPromise).rejects.toThrow("Chat timed out.");

		(chatSocket as any).resetTimeoutTimer();
	});
});
