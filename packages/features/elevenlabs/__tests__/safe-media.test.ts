import { ThirdPartyApiError } from "@itsrose/system";
import { vi } from "vitest";
import {
	assertSafeRemoteMediaUrl,
	MAX_REMOTE_MEDIA_BYTES,
	REMOTE_MEDIA_TIMEOUT_MS,
	safeMediaLookup,
} from "../src/utils/safe-url";

// The client reads its key from the environment when it is imported, so the
// environment has to be in place before the package is loaded.
// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.ELEVENLABS_API_KEY = "test-key";

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock("node:dns/promises", () => ({
	lookup: lookupMock,
}));

interface ResolvedAddress {
	address: string;
	family: number;
}

const PUBLIC_ADDRESS: ResolvedAddress = {
	address: "93.184.216.34",
	family: 4,
};

const REJECTED_MESSAGE = "The provided media URL is not allowed.";

/**
 * Makes the mocked resolver answer with the given addresses.
 *
 * @param addresses The answers the resolver returns.
 */
const resolveTo = (...addresses: ResolvedAddress[]): void => {
	lookupMock.mockResolvedValue(addresses);
};

/**
 * Awaits a promise and returns the failure it raised.
 *
 * @param promise The promise that is expected to fail.
 * @returns The raised value, or `undefined` when the promise resolved.
 */
const captureFailure = async (promise: Promise<unknown>): Promise<unknown> =>
	promise.then(
		() => undefined,
		(error: unknown) => error
	);

/**
 * Asserts that a promise failed with the generic rejected-URL failure.
 *
 * @param promise The promise that is expected to be refused.
 */
const expectRejectedMediaUrl = async (promise: Promise<unknown>) => {
	const failure = await captureFailure(promise);
	expect(failure).toBeInstanceOf(ThirdPartyApiError);
	expect((failure as ThirdPartyApiError).statusCode).toBe(400);
	expect((failure as ThirdPartyApiError).message).toBe(REJECTED_MESSAGE);
};

describe("features/elevenlabs safe media url", () => {
	beforeEach(() => {
		lookupMock.mockReset();
		resolveTo(PUBLIC_ADDRESS);
	});

	it("allows a public url", async () => {
		const url = await assertSafeRemoteMediaUrl(
			"https://media.example.com/audio.mp3"
		);

		expect(url).toBeInstanceOf(URL);
		expect(url.toString()).toBe("https://media.example.com/audio.mp3");
		expect(lookupMock).toHaveBeenCalledWith("media.example.com", {
			all: true,
		});
	});

	it("allows a public url served over http", async () => {
		const url = await assertSafeRemoteMediaUrl(
			"http://media.example.com/audio.mp3"
		);

		expect(url.protocol).toBe("http:");
	});

	it.each<[string, string]>([
		["a file: url", "file:///etc/passwd"],
		["an ftp: url", "ftp://media.example.com/audio.mp3"],
		["a localhost url", "http://localhost/audio.mp3"],
		["a localhost subdomain", "http://api.localhost/audio.mp3"],
		["a .local name", "http://printer.local/audio.mp3"],
		["a .internal name", "http://metadata.google.internal/audio.mp3"],
		["a loopback IPv4 address", "http://127.0.0.1/audio.mp3"],
		[
			"a link-local metadata IPv4 address",
			"http://169.254.169.254/latest/meta-data/",
		],
		["a private 10/8 address", "http://10.1.2.3/audio.mp3"],
		["a private 172.16/12 address", "http://172.16.0.1/audio.mp3"],
		["a private 192.168/16 address", "http://192.168.1.10/audio.mp3"],
		["a loopback IPv6 address", "http://[::1]/audio.mp3"],
		["a unique-local IPv6 address", "http://[fc00::1]/audio.mp3"],
		["a link-local IPv6 address", "http://[fe80::1]/audio.mp3"],
		[
			"an IPv4-mapped loopback address",
			"http://[::ffff:127.0.0.1]/audio.mp3",
		],
	])("rejects %s", async (_label, value) => {
		await expectRejectedMediaUrl(assertSafeRemoteMediaUrl(value));
	});

	it("rejects a url that embeds credentials", async () => {
		await expectRejectedMediaUrl(
			assertSafeRemoteMediaUrl(
				"https://user:password@media.example.com/audio.mp3"
			)
		);
	});

	it("rejects a url that cannot be parsed", async () => {
		await expectRejectedMediaUrl(assertSafeRemoteMediaUrl("not a url"));
	});

	it("rejects a host that resolves to a private address", async () => {
		resolveTo({ address: "10.0.0.5", family: 4 });

		await expectRejectedMediaUrl(
			assertSafeRemoteMediaUrl("https://media.example.com/audio.mp3")
		);
	});

	it("rejects a host when any resolved address is blocked", async () => {
		resolveTo(PUBLIC_ADDRESS, { address: "::1", family: 6 });

		await expectRejectedMediaUrl(
			assertSafeRemoteMediaUrl("https://media.example.com/audio.mp3")
		);
	});

	it("rejects a DNS failure without echoing its details", async () => {
		lookupMock.mockRejectedValue(
			new Error("getaddrinfo ENOTFOUND media.example.com")
		);

		const failure = await captureFailure(
			assertSafeRemoteMediaUrl("https://media.example.com/audio.mp3")
		);

		expect(failure).toBeInstanceOf(ThirdPartyApiError);
		expect((failure as ThirdPartyApiError).statusCode).toBe(400);
		expect((failure as ThirdPartyApiError).message).toBe(REJECTED_MESSAGE);
		expect((failure as ThirdPartyApiError).message).not.toContain(
			"ENOTFOUND"
		);
	});
});

describe("features/elevenlabs safe media lookup", () => {
	beforeEach(() => {
		lookupMock.mockReset();
		resolveTo(PUBLIC_ADDRESS);
	});

	/**
	 * Runs the transport lookup and returns what it answered with.
	 *
	 * @param options The lookup options the transport passes.
	 * @returns The callback arguments.
	 */
	const runLookup = (
		options: object
	): Promise<{
		error: Error | null;
		address: string | ResolvedAddress | Array<string | ResolvedAddress>;
		family?: number;
	}> =>
		new Promise((resolve) => {
			safeMediaLookup(
				"media.example.com",
				options,
				(error, address, family) => resolve({ error, address, family })
			);
		});

	it("returns the validated address to the transport", async () => {
		const { error, address, family } = await runLookup({ all: false });

		expect(error).toBeNull();
		expect(address).toBe(PUBLIC_ADDRESS.address);
		expect(family).toBe(4);
	});

	it("returns every validated address when the transport asks for all", async () => {
		const { error, address } = await runLookup({ all: true });

		expect(error).toBeNull();
		expect(address).toEqual([PUBLIC_ADDRESS]);
	});

	it("rejects a private answer at connect time", async () => {
		resolveTo({ address: "192.168.1.5", family: 4 });

		const { error, address } = await runLookup({ all: false });

		expect(error).toBeInstanceOf(ThirdPartyApiError);
		expect((error as ThirdPartyApiError).message).toBe(REJECTED_MESSAGE);
		expect(address).toBe("");
	});

	it("rejects a DNS failure at connect time without echoing it", async () => {
		lookupMock.mockRejectedValue(new Error("getaddrinfo EAI_AGAIN"));

		const { error } = await runLookup({ all: false });

		expect(error).toBeInstanceOf(ThirdPartyApiError);
		expect((error as ThirdPartyApiError).message).toBe(REJECTED_MESSAGE);
	});
});

describe("features/elevenlabs remote media fetch", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	beforeEach(() => {
		lookupMock.mockReset();
		resolveTo(PUBLIC_ADDRESS);
	});

	it("downloads a validated url with no redirects, a deadline and a byte cap", async () => {
		const { assetClient } = await import("../src/client/client");
		const { downloadRemoteMedia } = await import("../src/client/media");
		const sendSpy = vi
			.spyOn(assetClient, "send")
			.mockResolvedValue(Buffer.from("audio"));

		const target = await assertSafeRemoteMediaUrl(
			"https://media.example.com/audio.mp3"
		);
		const data = await downloadRemoteMedia(target);

		expect(data).toEqual(Buffer.from("audio"));

		const request = sendSpy.mock.calls[0]?.[0];
		expect(request).toBeDefined();
		expect(request?.url).toBe("https://media.example.com/audio.mp3");
		expect(request?.responseType).toBe("arraybuffer");
		expect(request?.maxRedirects).toBe(0);
		expect(request?.maxContentLength).toBe(25 * 1024 * 1024);
		expect(request?.maxContentLength).toBe(MAX_REMOTE_MEDIA_BYTES);
		expect(request?.timeout).toBe(REMOTE_MEDIA_TIMEOUT_MS);
		expect(REMOTE_MEDIA_TIMEOUT_MS).toBeGreaterThan(0);
		expect(typeof request?.lookup).toBe("function");
		expect(request?.validateStatus?.(200)).toBe(true);
		expect(request?.validateStatus?.(204)).toBe(true);
		expect(request?.validateStatus?.(301)).toBe(false);
		expect(request?.validateStatus?.(302)).toBe(false);
		expect(request?.validateStatus?.(404)).toBe(false);
	});

	it("never requests a url the guard refused", async () => {
		const { assetClient, httpClient } =
			await import("../src/client/client");
		const { createIVCVoice } =
			await import("../src/elevenlabs/create-ivc-voice");
		const assetSpy = vi
			.spyOn(assetClient, "send")
			.mockResolvedValue(Buffer.from("audio"));
		const httpSpy = vi.spyOn(httpClient, "send").mockResolvedValue({});

		const failure = await captureFailure(
			createIVCVoice({
				audio_urls: ["http://169.254.169.254/latest/meta-data/"],
				name: "a voice",
			})
		);

		expect(failure).toBeInstanceOf(ThirdPartyApiError);
		expect((failure as ThirdPartyApiError).statusCode).toBe(400);
		expect(assetSpy).not.toHaveBeenCalled();
		expect(httpSpy).not.toHaveBeenCalled();
	});

	it("never requests a speech-to-speech url the guard refused", async () => {
		const { assetClient, httpClient } =
			await import("../src/client/client");
		const { speechToSpeech } =
			await import("../src/elevenlabs/speech-to-speech");
		const assetSpy = vi
			.spyOn(assetClient, "send")
			.mockResolvedValue(Buffer.from("audio"));
		const httpSpy = vi.spyOn(httpClient, "send").mockResolvedValue({});

		const failure = await captureFailure(
			speechToSpeech("http://10.0.0.1/audio.mp3", {
				voice_id: "voice-1",
			})
		);

		expect(failure).toBeInstanceOf(ThirdPartyApiError);
		expect((failure as ThirdPartyApiError).statusCode).toBe(400);
		expect(assetSpy).not.toHaveBeenCalled();
		expect(httpSpy).not.toHaveBeenCalled();
	});
});
