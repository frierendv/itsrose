import { FailureResponse, SuccessResponse } from "@itsrose/api-response";
import { ThirdPartyApiError } from "@itsrose/system";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import type { IElevenLabsListVoicesResponse } from "../../features/elevenlabs/src/zod-schema";
import {
	AUDIO_ROUTE_PREFIX,
	audioRoutes,
	VoiceAccessDeniedError,
	VoiceAccessUnavailableError,
	type ClonedVoice,
	type VoiceAccessPort,
} from "../src/audio";
import {
	elevenLabsCalls,
	resetElevenLabsMock,
	setCreateIVCVoiceError,
	setVoices,
} from "./mocks/elevenlabs";

/* -------------------------------------------------------------------------- */
/*                                  Fixtures                                  */
/* -------------------------------------------------------------------------- */

type Voice = IElevenLabsListVoicesResponse["voices"][number];

/**
 * One upstream voice, complete enough for the published schema.
 *
 * The route tests only read `voice_id` and `category`; every other documented
 * field still has to be present because the response schema types them.
 */
const voice = (voiceId: string, category: Voice["category"]): Voice => ({
	voice_id: voiceId,
	name: voiceId,
	samples: null,
	category,
	fine_tuning: null,
	labels: {},
	description: null,
	preview_url: null,
	available_for_tiers: [],
	settings: null,
	sharing: null,
	high_quality_base_model_ids: [],
	verified_languages: null,
	voice_verification: null,
	is_owner: false,
	is_legacy: false,
	is_mixed: false,
});

const TTS_BODY = { text: "Hello world", voice_id: "owned-1" };

const CLONE_BODY = {
	audio_urls: ["https://assets.test/sample.wav"],
	name: "My Clone",
};

/* -------------------------------------------------------------------------- */
/*                                  Fakes                                     */
/* -------------------------------------------------------------------------- */

type PortCalls = {
	listed: FastifyRequest[];
	checked: Array<{ request: FastifyRequest; voiceId: string }>;
	recorded: Array<{ request: FastifyRequest; voice: ClonedVoice }>;
	deleted: Array<{ request: FastifyRequest; voiceId: string }>;
};

type PortOptions = {
	/** Ids the caller owns; `listOwnedVoiceIds` answers with them. */
	owned?: string[];
	/** Premade ids `assertCanUseVoice` allows besides the owned ones. */
	premade?: string[];
	/** Makes `recordClonedVoice` reject, simulating a failed ledger write. */
	recordError?: Error;
};

/**
 * Builds a recording voice-access port.
 *
 * Everything the caller owns is allowed, plus the premade ids the test names;
 * every other id is refused with the typed denial the routes are expected to
 * propagate.
 */
function createPort(options: PortOptions = {}): {
	port: VoiceAccessPort;
	calls: PortCalls;
} {
	const allowed = new Set([
		...(options.owned ?? []),
		...(options.premade ?? []),
	]);
	const calls: PortCalls = {
		listed: [],
		checked: [],
		recorded: [],
		deleted: [],
	};

	const port: VoiceAccessPort = {
		async listOwnedVoiceIds(request) {
			calls.listed.push(request);
			return options.owned ?? [];
		},
		async assertCanUseVoice(request, voiceId) {
			calls.checked.push({ request, voiceId });
			if (!allowed.has(voiceId)) {
				throw new VoiceAccessDeniedError(voiceId);
			}
		},
		async recordClonedVoice(request, cloned) {
			calls.recorded.push({ request, voice: cloned });
			if (options.recordError) {
				throw options.recordError;
			}
		},
		async deleteOwnedVoice(request, voiceId) {
			calls.deleted.push({ request, voiceId });
		},
	};

	return { port, calls };
}

/* -------------------------------------------------------------------------- */
/*                                Test server                                 */
/* -------------------------------------------------------------------------- */

type BuildOptions = {
	/** Omitted, the module runs without the ownership port. */
	voiceAccess?: VoiceAccessPort;
};

type BuiltApp = {
	app: FastifyInstance;
	/** The last error the route raised, as the host mapper would see it. */
	lastError: () => unknown;
	/** The log lines the app wrote. */
	logs: string[];
};

/**
 * Builds a bare audio app with the Zod compilers and an error probe.
 *
 * The probe records the error the route threw before replying, so a test can
 * assert the *typed* failure - the HTTP mapping is the host's job, not the
 * route module's.
 */
async function build(options: BuildOptions = {}): Promise<BuiltApp> {
	const logs: string[] = [];
	let lastError: unknown;

	const app = Fastify({
		logger: {
			level: "error",
			stream: {
				write(line: string) {
					logs.push(line);
				},
			},
		},
	});

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(
		createSerializerCompiler({
			stringify(value) {
				if (
					value instanceof SuccessResponse ||
					value instanceof FailureResponse
				) {
					return JSON.stringify(value);
				}
				return JSON.stringify(
					new SuccessResponse({ data: value, code: "OK" })
				);
			},
		})
	);

	app.setErrorHandler((error, _request, reply) => {
		lastError = error;
		const name = error instanceof Error ? error.name : "UnknownError";
		void reply.status(500).send({ name });
	});

	await app.register(audioRoutes, {
		prefix: AUDIO_ROUTE_PREFIX,
		declareAudioResponseHeader: false,
		voiceAccess: options.voiceAccess,
	});
	await app.ready();

	return { app, lastError: () => lastError, logs };
}

beforeEach(() => {
	resetElevenLabsMock();
});

/* -------------------------------------------------------------------------- */
/*                                  Listing                                   */
/* -------------------------------------------------------------------------- */

describe("GET /get_voices", () => {
	it("filters the upstream list to the caller's voices plus premade", async () => {
		setVoices([
			voice("owned-1", "cloned"),
			voice("foreign-1", "cloned"),
			voice("premade-1", "premade"),
		]);
		const { port, calls } = createPort({
			owned: ["owned-1"],
			premade: ["premade-1"],
		});
		const { app } = await build({ voiceAccess: port });

		const response = await app.inject({
			method: "GET",
			url: "/audio/get_voices",
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.data.voices.map((item: Voice) => item.voice_id)).toEqual([
			"owned-1",
			"premade-1",
		]);
		expect(calls.listed).toHaveLength(1);

		await app.close();
	});

	it("returns the upstream list unchanged without the ownership port", async () => {
		setVoices([
			voice("owned-1", "cloned"),
			voice("foreign-1", "cloned"),
			voice("premade-1", "premade"),
		]);
		const { app } = await build();

		const response = await app.inject({
			method: "GET",
			url: "/audio/get_voices",
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.data.voices.map((item: Voice) => item.voice_id)).toEqual([
			"owned-1",
			"foreign-1",
			"premade-1",
		]);

		await app.close();
	});
});

/* -------------------------------------------------------------------------- */
/*                                 Synthesis                                  */
/* -------------------------------------------------------------------------- */

describe("the synthesis routes", () => {
	it("denies a voice the caller neither owns nor may use", async () => {
		const { port, calls } = createPort({ premade: ["premade-1"] });
		const { app, lastError } = await build({ voiceAccess: port });

		await app.inject({
			method: "POST",
			url: "/audio/text_to_speech",
			payload: { text: "Hello world", voice_id: "foreign-1" },
		});

		const error = lastError();
		expect(error).toBeInstanceOf(VoiceAccessDeniedError);
		expect((error as VoiceAccessDeniedError).voiceId).toBe("foreign-1");
		expect(calls.checked).toHaveLength(1);
		// The upstream is never called for a refused voice.
		expect(elevenLabsCalls).not.toContain("textToSpeech");

		await app.close();
	});

	it("allows an owned voice", async () => {
		const { port } = createPort({ owned: ["owned-1"] });
		const { app, lastError } = await build({ voiceAccess: port });

		const response = await app.inject({
			method: "POST",
			url: "/audio/text_to_speech",
			payload: TTS_BODY,
		});

		expect(response.statusCode).toBe(200);
		expect(lastError()).toBeUndefined();
		expect(elevenLabsCalls).toContain("textToSpeech");

		await app.close();
	});

	it("allows a premade voice", async () => {
		const { port } = createPort({ premade: ["premade-1"] });
		const { app, lastError } = await build({ voiceAccess: port });

		const response = await app.inject({
			method: "POST",
			url: "/audio/text_to_speech",
			payload: { text: "Hello world", voice_id: "premade-1" },
		});

		expect(response.statusCode).toBe(200);
		expect(lastError()).toBeUndefined();
		expect(elevenLabsCalls).toContain("textToSpeech");

		await app.close();
	});

	it("checks the voice of the timestamped speech route too", async () => {
		const { port } = createPort();
		const { app, lastError } = await build({ voiceAccess: port });

		await app.inject({
			method: "POST",
			url: "/audio/text_to_speech/with_timestamp",
			payload: { text: "Hello world", voice_id: "foreign-1" },
		});

		expect(lastError()).toBeInstanceOf(VoiceAccessDeniedError);
		expect(elevenLabsCalls).not.toContain("textToSpeechWithTiming");

		await app.close();
	});

	it("denies a speech-to-speech target voice before fetching audio", async () => {
		const { port } = createPort();
		const { app, lastError } = await build({ voiceAccess: port });

		await app.inject({
			method: "POST",
			url: "/audio/speech_to_speech",
			payload: {
				audio: "https://assets.test/input.wav",
				voice_id: "foreign-1",
			},
		});

		expect(lastError()).toBeInstanceOf(VoiceAccessDeniedError);
		expect(elevenLabsCalls).not.toContain("speechToSpeech");

		await app.close();
	});

	it("checks every voice of a dialogue and refuses on the first foreign one", async () => {
		const { port, calls } = createPort({ owned: ["owned-1"] });
		const { app, lastError } = await build({ voiceAccess: port });

		await app.inject({
			method: "POST",
			url: "/audio/text_to_dialogue",
			payload: {
				inputs: [
					{ text: "Hi", voice_id: "owned-1" },
					{ text: "There", voice_id: "foreign-1" },
				],
			},
		});

		const error = lastError();
		expect(error).toBeInstanceOf(VoiceAccessDeniedError);
		expect((error as VoiceAccessDeniedError).voiceId).toBe("foreign-1");
		expect(calls.checked.map((call) => call.voiceId)).toEqual([
			"owned-1",
			"foreign-1",
		]);
		expect(elevenLabsCalls).not.toContain("textToDialogue");

		await app.close();
	});

	it("allows a dialogue whose voices are all owned or premade", async () => {
		const { port } = createPort({
			owned: ["owned-1"],
			premade: ["premade-1"],
		});
		const { app, lastError } = await build({ voiceAccess: port });

		const response = await app.inject({
			method: "POST",
			url: "/audio/text_to_dialogue",
			payload: {
				inputs: [
					{ text: "Hi", voice_id: "owned-1" },
					{ text: "There", voice_id: "premade-1" },
				],
			},
		});

		expect(response.statusCode).toBe(200);
		expect(lastError()).toBeUndefined();
		expect(elevenLabsCalls).toContain("textToDialogue");

		await app.close();
	});
});

/* -------------------------------------------------------------------------- */
/*                                   Cloning                                  */
/* -------------------------------------------------------------------------- */

describe("POST /create_clone_voice", () => {
	it("records the created voice against the caller", async () => {
		const { port, calls } = createPort();
		const { app, lastError } = await build({ voiceAccess: port });

		const response = await app.inject({
			method: "POST",
			url: "/audio/create_clone_voice",
			payload: CLONE_BODY,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json().data).toEqual({
			voice_id: "voice",
			requires_verification: false,
		});
		expect(lastError()).toBeUndefined();
		expect(calls.recorded).toHaveLength(1);
		expect(calls.recorded[0]?.voice).toEqual({
			voice_id: "voice",
			name: CLONE_BODY.name,
		});

		await app.close();
	});

	it("records nothing when the upstream create fails", async () => {
		const upstreamError = new ThirdPartyApiError("upstream refused", 502);
		setCreateIVCVoiceError(upstreamError);
		const { port, calls } = createPort();
		const { app, lastError } = await build({ voiceAccess: port });

		await app.inject({
			method: "POST",
			url: "/audio/create_clone_voice",
			payload: CLONE_BODY,
		});

		expect(lastError()).toBe(upstreamError);
		expect(calls.recorded).toEqual([]);

		await app.close();
	});

	it("fails the request when the created voice cannot be recorded", async () => {
		const { port, calls } = createPort({
			recordError: new Error("ledger unavailable"),
		});
		const { app, lastError, logs } = await build({ voiceAccess: port });

		await app.inject({
			method: "POST",
			url: "/audio/create_clone_voice",
			payload: CLONE_BODY,
		});

		// The clone exists upstream but is not registered: returning success
		// would hand the caller a voice it can neither list nor use.
		const error = lastError();
		expect(error).toBeInstanceOf(ThirdPartyApiError);
		expect((error as ThirdPartyApiError).statusCode).toBe(502);
		expect(calls.recorded).toHaveLength(1);
		expect(logs.join("\n")).toContain("could not be recorded");

		await app.close();
	});
});

/* -------------------------------------------------------------------------- */
/*                                  Deletion                                  */
/* -------------------------------------------------------------------------- */

describe("DELETE /voices/:voice_id", () => {
	it("delegates the deletion to the ownership port", async () => {
		const { port, calls } = createPort({ owned: ["owned-1"] });
		const { app, lastError } = await build({ voiceAccess: port });

		const response = await app.inject({
			method: "DELETE",
			url: "/audio/voices/owned-1",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json().data).toEqual({ deleted: true });
		expect(lastError()).toBeUndefined();
		expect(calls.deleted).toHaveLength(1);
		expect(calls.deleted[0]?.voiceId).toBe("owned-1");

		await app.close();
	});

	it("is unavailable without the ownership port", async () => {
		const { app, lastError } = await build();

		await app.inject({
			method: "DELETE",
			url: "/audio/voices/owned-1",
		});

		expect(lastError()).toBeInstanceOf(VoiceAccessUnavailableError);

		await app.close();
	});
});
