import {
	createVoiceAccess,
	PREMADE_VOICE_CACHE_TTL_MS,
	type FetchVoices,
	type VoiceAccessService,
} from "@/lib/voice-access";
import {
	VoiceAccessDeniedError,
	VoiceAccessUnavailableError,
} from "@itsrose/api-routes/audio";
import type { ProviderResource } from "@itsrose/auth-resources/types";
import {
	VoiceNotFoundError,
	type ListVoicesInput,
	type RecordVoiceInput,
	type RemoveVoiceInput,
} from "@itsrose/auth-resources/voices";
import type {
	IElevenLabsListVoices,
	IElevenLabsListVoicesResponse,
} from "@itsrose/elevenlabs";
import type { FastifyRequest } from "fastify";
import { vi } from "vitest";

const USER_ID = "user-1";
const TENANT_ID = "tenant-1";

type Voice = IElevenLabsListVoicesResponse["voices"][number];

/**
 * One upstream voice, complete enough for the published schema.
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

const record = (voiceId: string): ProviderResource => ({
	resource_id: `resource-${voiceId}`,
	provider: "elevenlabs",
	provider_resource_id: voiceId,
	tenant_id: TENANT_ID,
	user_id: USER_ID,
	kind: "voice",
	name: voiceId,
	sample_asset_id: null,
	status: "active",
	created_at: new Date("2026-11-20T00:00:00.000Z"),
	deleted_at: null,
});

/**
 * The request the port reads the caller from.
 *
 * Only `userId` is read; the rest of the Fastify request is irrelevant to the
 * access port.
 */
const request = (userId: string | null = USER_ID): FastifyRequest =>
	({ userId }) as unknown as FastifyRequest;

/* -------------------------------------------------------------------------- */
/*                                  Fakes                                     */
/* -------------------------------------------------------------------------- */

type ServiceCalls = {
	list: ListVoicesInput[];
	record: RecordVoiceInput[];
	remove: RemoveVoiceInput[];
};

type ServiceOptions = {
	/** The caller's live rows. */
	records?: ProviderResource[];
	/** Makes the ledger read reject. */
	listError?: Error;
	/** Makes the ledger delete reject. */
	removeError?: Error;
};

function createService(options: ServiceOptions = {}): {
	service: VoiceAccessService;
	calls: ServiceCalls;
} {
	const calls: ServiceCalls = { list: [], record: [], remove: [] };

	const service: VoiceAccessService = {
		async list(input) {
			calls.list.push(input);
			if (options.listError) {
				throw options.listError;
			}
			return options.records ?? [];
		},
		async record(input) {
			calls.record.push(input);
			return record(input.providerResourceId);
		},
		async remove(input) {
			calls.remove.push(input);
			if (options.removeError) {
				throw options.removeError;
			}
		},
	};

	return { service, calls };
}

function createFetchVoices(voices: Voice[]): {
	fetchVoices: FetchVoices;
	calls: Array<IElevenLabsListVoices | undefined>;
} {
	const calls: Array<IElevenLabsListVoices | undefined> = [];

	return {
		calls,
		fetchVoices: async (listOptions) => {
			calls.push(listOptions);
			return { voices };
		},
	};
}

afterEach(() => {
	vi.useRealTimers();
});

/* -------------------------------------------------------------------------- */
/*                                 Assertions                                 */
/* -------------------------------------------------------------------------- */

describe("assertCanUseVoice", () => {
	it("allows an owned voice without fetching the premade catalogue", async () => {
		const { service } = createService({ records: [record("owned-1")] });
		const fetchVoices: FetchVoices = async () => {
			throw new Error("the premade catalogue must not be fetched");
		};
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.assertCanUseVoice(request(), "owned-1")
		).resolves.toBeUndefined();
	});

	it("allows a premade voice and asks the upstream for premade only", async () => {
		const { service } = createService();
		const { fetchVoices, calls } = createFetchVoices([
			voice("premade-1", "premade"),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.assertCanUseVoice(request(), "premade-1")
		).resolves.toBeUndefined();
		expect(calls).toEqual([{ category: "premade" }]);
	});

	it("drops an upstream voice the filter could not exclude", async () => {
		const { service } = createService();
		// The upstream answered with a voice that is not premade although the
		// request asked for premade only: the port filters the response too.
		const { fetchVoices } = createFetchVoices([
			voice("cloned-1", "cloned"),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.assertCanUseVoice(request(), "cloned-1")
		).rejects.toBeInstanceOf(VoiceAccessDeniedError);
	});

	it("denies a voice the caller neither owns nor may use", async () => {
		const { service } = createService({ records: [record("owned-1")] });
		const { fetchVoices } = createFetchVoices([
			voice("premade-1", "premade"),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.assertCanUseVoice(request(), "foreign-1")
		).rejects.toMatchObject({
			name: "VoiceAccessDeniedError",
			voiceId: "foreign-1",
		});
	});
});

/* -------------------------------------------------------------------------- */
/*                              Premade catalogue                             */
/* -------------------------------------------------------------------------- */

describe("the premade catalogue cache", () => {
	it("fetches once and reuses the cached ids", async () => {
		const { service } = createService();
		const { fetchVoices, calls } = createFetchVoices([
			voice("premade-1", "premade"),
			voice("premade-2", "premade"),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		await port.assertCanUseVoice(request(), "premade-1");
		await port.assertCanUseVoice(request(), "premade-2");

		expect(calls).toHaveLength(1);
	});

	it("fetches a new catalogue once the TTL has passed", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-11-20T00:00:00.000Z"));

		const { service } = createService();
		const { fetchVoices, calls } = createFetchVoices([
			voice("premade-1", "premade"),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		await port.assertCanUseVoice(request(), "premade-1");
		vi.advanceTimersByTime(PREMADE_VOICE_CACHE_TTL_MS + 1);
		await port.assertCanUseVoice(request(), "premade-1");

		expect(calls).toHaveLength(2);
	});

	it("shares one in-flight fetch between concurrent checks", async () => {
		const { service } = createService();
		const deferred: {
			resolve: ((value: IElevenLabsListVoicesResponse) => void) | null;
		} = { resolve: null };
		let fetchCount = 0;
		const fetchVoices: FetchVoices = async () => {
			fetchCount += 1;
			return new Promise<IElevenLabsListVoicesResponse>((resolve) => {
				deferred.resolve = resolve;
			});
		};
		const port = createVoiceAccess({ service, fetchVoices });

		const first = port.assertCanUseVoice(request(), "premade-1");
		const second = port.assertCanUseVoice(request(), "premade-2");

		await vi.waitFor(() => {
			expect(deferred.resolve).not.toBeNull();
		});
		deferred.resolve?.({
			voices: [
				voice("premade-1", "premade"),
				voice("premade-2", "premade"),
			],
		});
		await Promise.all([first, second]);

		expect(fetchCount).toBe(1);
	});

	it("does not cache a failed fetch", async () => {
		const { service } = createService();
		let fetchCount = 0;
		const fetchVoices: FetchVoices = async () => {
			fetchCount += 1;
			if (fetchCount === 1) {
				throw new Error("upstream unavailable");
			}
			return { voices: [voice("premade-1", "premade")] };
		};
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.assertCanUseVoice(request(), "premade-1")
		).rejects.toThrow("upstream unavailable");
		await expect(
			port.assertCanUseVoice(request(), "premade-1")
		).resolves.toBeUndefined();
		expect(fetchCount).toBe(2);
	});
});

/* -------------------------------------------------------------------------- */
/*                            Recording and deleting                          */
/* -------------------------------------------------------------------------- */

describe("recordClonedVoice", () => {
	it("records the clone against the caller under the tenant", async () => {
		const { service, calls } = createService();
		const { fetchVoices } = createFetchVoices([]);
		const port = createVoiceAccess({ service, fetchVoices });

		await port.recordClonedVoice(request(), {
			voice_id: "voice-1",
			name: "Narrator",
		});

		expect(calls.record).toEqual([
			{
				userId: USER_ID,
				tenantId: expect.any(String) as string,
				provider: "elevenlabs",
				providerResourceId: "voice-1",
				name: "Narrator",
			},
		]);
	});
});

describe("deleteOwnedVoice", () => {
	it("deletes through the ledger under the caller", async () => {
		const { service, calls } = createService();
		const { fetchVoices } = createFetchVoices([]);
		const port = createVoiceAccess({ service, fetchVoices });

		await port.deleteOwnedVoice(request(), "owned-1");

		expect(calls.remove).toEqual([
			{ userId: USER_ID, providerResourceId: "owned-1" },
		]);
	});

	it("propagates the ledger's not-found for a foreign or missing voice", async () => {
		const { service } = createService({
			removeError: new VoiceNotFoundError("voice-1"),
		});
		const { fetchVoices } = createFetchVoices([]);
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.deleteOwnedVoice(request(), "voice-1")
		).rejects.toBeInstanceOf(VoiceNotFoundError);
	});
});

/* -------------------------------------------------------------------------- */
/*                               Missing caller                               */
/* -------------------------------------------------------------------------- */

describe("a request without a user context", () => {
	it("fails fast instead of treating the request as unowned", async () => {
		const { service } = createService({ records: [record("owned-1")] });
		const { fetchVoices } = createFetchVoices([]);
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.listOwnedVoiceIds(request(null))
		).rejects.toBeInstanceOf(VoiceAccessUnavailableError);
		await expect(
			port.recordClonedVoice(request(null), {
				voice_id: "voice-1",
				name: "Narrator",
			})
		).rejects.toBeInstanceOf(VoiceAccessUnavailableError);
	});
});
