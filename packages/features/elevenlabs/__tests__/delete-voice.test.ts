import { UpstreamApiError } from "@itsrose/upstream-client";
import { vi } from "vitest";

// The client reads its key from the environment when it is imported, so the
// environment has to be in place before the package is loaded.
// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.ELEVENLABS_API_KEY = "test-key";

describe("features/elevenlabs deleteVoice", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("deletes the voice and returns the upstream status", async () => {
		const { httpClient } = await import("../src/client/client");
		const { deleteVoice } = await import("../src/elevenlabs/delete-voice");
		const { ElevenLabsDeleteVoiceResponseSchema } =
			await import("../src/zod-schema");
		const sendSpy = vi
			.spyOn(httpClient, "send")
			.mockResolvedValue({ status: "ok" });

		const result = await deleteVoice("voice-1");

		expect(result).toEqual({ status: "ok" });
		const request = sendSpy.mock.calls[0]?.[0];
		expect(request).toBeDefined();
		expect(request?.method).toBe("delete");
		expect(request?.url).toBe("/v1/voices/voice-1");
		expect(request?.schema).toBe(ElevenLabsDeleteVoiceResponseSchema);
		expect(request?.retry).toEqual({
			retryCondition: expect.any(Function),
		});
	});

	it("propagates an upstream failure", async () => {
		const { httpClient } = await import("../src/client/client");
		const { deleteVoice } = await import("../src/elevenlabs/delete-voice");
		const failure = new UpstreamApiError("Voice not found", 404, {
			service: "elevenlabs",
			upstreamStatus: 404,
		});
		vi.spyOn(httpClient, "send").mockRejectedValue(failure);

		const raised = await deleteVoice("missing-voice").catch(
			(error: unknown) => error
		);

		expect(raised).toBe(failure);
	});

	it("percent-encodes the voice id in the request path", async () => {
		const { httpClient } = await import("../src/client/client");
		const { deleteVoice } = await import("../src/elevenlabs/delete-voice");
		const sendSpy = vi
			.spyOn(httpClient, "send")
			.mockResolvedValue({ status: "ok" });

		await deleteVoice("voice/with space?query=1");

		expect(sendSpy.mock.calls[0]?.[0].url).toBe(
			"/v1/voices/voice%2Fwith%20space%3Fquery%3D1"
		);
	});
});
