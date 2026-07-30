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
});
