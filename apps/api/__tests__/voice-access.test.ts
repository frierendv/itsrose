import { createVoiceAccess, type VoiceAccessService } from "@/lib/voice-access";
import {
	VOICE_CATALOG_MAX_PAGES,
	VOICE_CATALOG_PAGE_SIZE,
	VOICE_CATALOG_TTL_MS,
	type FetchVoices,
	type VoiceCatalogLogger,
} from "@/lib/voice-catalog";
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
const voice = (
	voiceId: string,
	category: Voice["category"],
	overrides: Partial<Voice> = {}
): Voice => ({
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
	...overrides,
});

/**
 * One upstream page.
 */
const page = (
	voices: Voice[],
	options: { has_more?: boolean; next_page_token?: string | null } = {}
): IElevenLabsListVoicesResponse => ({
	voices,
	has_more: options.has_more ?? false,
	next_page_token: options.next_page_token ?? null,
	total_count: null,
});

const resource = (voiceId: string, name = voiceId): ProviderResource => ({
	resource_id: `resource-${voiceId}`,
	provider: "elevenlabs",
	provider_resource_id: voiceId,
	tenant_id: TENANT_ID,
	user_id: USER_ID,
	kind: "voice",
	name,
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
	/** Makes the ledger write reject. */
	recordError?: Error;
	/** Makes the ledger delete reject. */
	removeError?: Error;
};

/**
 * The ledger over an in-memory row list: a successful `record` appends the
 * row, so a test can observe a clone appearing after the write.
 */
function createService(options: ServiceOptions = {}): {
	service: VoiceAccessService;
	calls: ServiceCalls;
	records: ProviderResource[];
} {
	const calls: ServiceCalls = { list: [], record: [], remove: [] };
	const records: ProviderResource[] = [...(options.records ?? [])];

	const service: VoiceAccessService = {
		async list(input) {
			calls.list.push(input);
			if (options.listError) {
				throw options.listError;
			}
			return records;
		},
		async record(input) {
			calls.record.push(input);
			if (options.recordError) {
				throw options.recordError;
			}
			const stored = resource(input.providerResourceId, input.name);
			records.push(stored);
			return stored;
		},
		async remove(input) {
			calls.remove.push(input);
			if (options.removeError) {
				throw options.removeError;
			}
		},
	};

	return { service, calls, records };
}

type FetchStep = IElevenLabsListVoicesResponse | Error;

/**
 * The upstream catalogue reader over canned pages.
 *
 * The last step is repeated once the script runs out, so a test that refetches
 * after the TTL does not have to script every read.
 */
function createFetchVoices(steps: FetchStep[]): {
	fetchVoices: FetchVoices;
	calls: Array<IElevenLabsListVoices | undefined>;
} {
	const calls: Array<IElevenLabsListVoices | undefined> = [];
	let index = 0;

	const fetchVoices: FetchVoices = async (options) => {
		calls.push(options);
		const step = steps[index] ?? steps[steps.length - 1];
		index += 1;

		if (step instanceof Error) {
			throw step;
		}
		if (!step) {
			throw new Error("the voice catalogue script has no pages.");
		}
		return step;
	};

	return { fetchVoices, calls };
}

function createLogger(): {
	logger: VoiceCatalogLogger;
	warnings: string[];
} {
	const warnings: string[] = [];

	return {
		warnings,
		logger: {
			warn(message) {
				warnings.push(message);
			},
		},
	};
}

afterEach(() => {
	vi.useRealTimers();
});

/* -------------------------------------------------------------------------- */
/*                              Synthesis check                               */
/* -------------------------------------------------------------------------- */

describe("assertCanUseVoice", () => {
	it("allows an owned voice without reading the catalogue", async () => {
		const { service } = createService({ records: [resource("owned-1")] });
		const fetchVoices: FetchVoices = async () => {
			throw new Error("the catalogue must not be read");
		};
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.assertCanUseVoice(request(), "owned-1")
		).resolves.toBeUndefined();
	});

	it("allows a premade voice from a later catalogue page", async () => {
		const { service } = createService();
		const { fetchVoices, calls } = createFetchVoices([
			page([voice("cloned-1", "cloned")], {
				has_more: true,
				next_page_token: "page-2",
			}),
			page([voice("premade-1", "premade")]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.assertCanUseVoice(request(), "premade-1")
		).resolves.toBeUndefined();
		expect(calls).toEqual([
			{
				page_size: VOICE_CATALOG_PAGE_SIZE,
				next_page_token: undefined,
			},
			{
				page_size: VOICE_CATALOG_PAGE_SIZE,
				next_page_token: "page-2",
			},
		]);
	});

	it("denies a catalogue voice that is not premade and not owned", async () => {
		const { service } = createService();
		const { fetchVoices } = createFetchVoices([
			page([voice("foreign-1", "cloned")]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.assertCanUseVoice(request(), "foreign-1")
		).rejects.toMatchObject({
			name: "VoiceAccessDeniedError",
			voiceId: "foreign-1",
		});
	});

	it("denies a voice that is not in the catalogue at all", async () => {
		const { service } = createService();
		const { fetchVoices } = createFetchVoices([page([])]);
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.assertCanUseVoice(request(), "missing-1")
		).rejects.toBeInstanceOf(VoiceAccessDeniedError);
	});
});

/* -------------------------------------------------------------------------- */
/*                              Visible library                               */
/* -------------------------------------------------------------------------- */

describe("listVisibleVoices", () => {
	it("builds the library from the whole paginated catalogue", async () => {
		const { service } = createService({ records: [resource("owned-1")] });
		const { fetchVoices, calls } = createFetchVoices([
			page([voice("owned-1", "cloned"), voice("foreign-1", "cloned")], {
				has_more: true,
				next_page_token: "page-2",
			}),
			page([
				voice("premade-1", "premade"),
				voice("premade-2", "premade"),
			]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		const response = await port.listVisibleVoices(request(), {});

		expect(calls).toHaveLength(2);
		expect(response.voices.map((item) => item.voice_id)).toEqual([
			"owned-1",
			"premade-1",
			"premade-2",
		]);
		expect(response).toMatchObject({
			has_more: false,
			next_page_token: null,
			total_count: 3,
		});
	});

	it("merges duplicate ids with the later page winning", async () => {
		const { service } = createService({ records: [resource("owned-1")] });
		const { fetchVoices } = createFetchVoices([
			page([voice("owned-1", "cloned", { name: "Old name" })], {
				has_more: true,
				next_page_token: "page-2",
			}),
			page([voice("owned-1", "cloned", { name: "New name" })]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		const response = await port.listVisibleVoices(request(), {});

		expect(response.voices).toHaveLength(1);
		expect(response.voices[0]?.name).toBe("New name");
	});

	it("keeps only owned and premade voices", async () => {
		const { service } = createService({ records: [resource("owned-1")] });
		const { fetchVoices } = createFetchVoices([
			page([
				voice("owned-1", "cloned"),
				voice("foreign-1", "cloned"),
				voice("premade-1", "premade"),
				voice("premade-2", "premade"),
			]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		const response = await port.listVisibleVoices(request(), {});

		expect(response.voices.map((item) => item.voice_id)).toEqual([
			"owned-1",
			"premade-1",
			"premade-2",
		]);
	});

	it("keeps the catalogue order when no sort is requested", async () => {
		const { service } = createService();
		const { fetchVoices } = createFetchVoices([
			page([
				voice("premade-c", "premade"),
				voice("premade-a", "premade"),
				voice("premade-b", "premade"),
			]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		const response = await port.listVisibleVoices(request(), {});

		expect(response.voices.map((item) => item.voice_id)).toEqual([
			"premade-c",
			"premade-a",
			"premade-b",
		]);
	});

	it("applies a case-insensitive substring search over name, description, labels and category", async () => {
		const { service } = createService({ records: [resource("owned-1")] });
		const { fetchVoices } = createFetchVoices([
			page([
				voice("premade-1", "premade", {
					name: "Alice Narrator",
				}),
				voice("premade-2", "premade", {
					name: "Bob",
					description: "A Calm Voice",
				}),
				voice("premade-3", "premade", {
					name: "Carol",
					labels: { accent: "British" },
				}),
				voice("owned-1", "cloned", { name: "My Clone" }),
			]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		const byName = await port.listVisibleVoices(request(), {
			search: "NARRATOR",
		});
		expect(byName.voices.map((item) => item.voice_id)).toEqual([
			"premade-1",
		]);

		const byDescription = await port.listVisibleVoices(request(), {
			search: " calm ",
		});
		expect(byDescription.voices.map((item) => item.voice_id)).toEqual([
			"premade-2",
		]);

		const byLabel = await port.listVisibleVoices(request(), {
			search: "british",
		});
		expect(byLabel.voices.map((item) => item.voice_id)).toEqual([
			"premade-3",
		]);

		// `premade` matches the category of the platform catalogue, but not
		// the caller's cloned voice.
		const byCategory = await port.listVisibleVoices(request(), {
			search: "premade",
		});
		expect(byCategory.voices.map((item) => item.voice_id)).toEqual([
			"premade-1",
			"premade-2",
			"premade-3",
		]);
	});

	it("sorts by name and by creation time in both directions", async () => {
		const { service } = createService();
		const { fetchVoices } = createFetchVoices([
			page([
				voice("b", "premade", {
					name: "Bravo",
					created_at_unix: 2,
				}),
				voice("a", "premade", {
					name: "Alpha",
					created_at_unix: 3,
				}),
				voice("c", "premade", {
					name: "Charlie",
					created_at_unix: 1,
				}),
			]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		const nameAsc = await port.listVisibleVoices(request(), {
			sort: "name",
		});
		expect(nameAsc.voices.map((item) => item.name)).toEqual([
			"Alpha",
			"Bravo",
			"Charlie",
		]);

		const nameDesc = await port.listVisibleVoices(request(), {
			sort: "name",
			sort_direction: "desc",
		});
		expect(nameDesc.voices.map((item) => item.name)).toEqual([
			"Charlie",
			"Bravo",
			"Alpha",
		]);

		const createdAsc = await port.listVisibleVoices(request(), {
			sort: "created_at_unix",
		});
		expect(createdAsc.voices.map((item) => item.voice_id)).toEqual([
			"c",
			"b",
			"a",
		]);

		const createdDesc = await port.listVisibleVoices(request(), {
			sort: "created_at_unix",
			sort_direction: "desc",
		});
		expect(createdDesc.voices.map((item) => item.voice_id)).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	it("ignores caller pagination and reports the whole filtered library", async () => {
		const { service } = createService();
		const { fetchVoices } = createFetchVoices([
			page([
				voice("premade-1", "premade"),
				voice("premade-2", "premade"),
			]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		const response = await port.listVisibleVoices(request(), {
			page_size: 1,
			next_page_token: "page-2",
		});

		expect(response.voices).toHaveLength(2);
		expect(response).toMatchObject({
			has_more: false,
			next_page_token: null,
			total_count: 2,
		});
	});
});

/* -------------------------------------------------------------------------- */
/*                               Catalogue cache                              */
/* -------------------------------------------------------------------------- */

describe("the catalogue cache", () => {
	it("reads the catalogue once and reuses it", async () => {
		const { service } = createService({ records: [resource("owned-1")] });
		const { fetchVoices, calls } = createFetchVoices([
			page([voice("owned-1", "cloned"), voice("premade-1", "premade")]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		await port.listVisibleVoices(request(), {});
		await port.listVisibleVoices(request(), { search: "premade" });
		await port.assertCanUseVoice(request(), "premade-1");

		expect(calls).toHaveLength(1);
	});

	it("re-reads the catalogue once the TTL has passed", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-11-20T00:00:00.000Z"));

		const { service } = createService();
		const { fetchVoices, calls } = createFetchVoices([
			page([voice("premade-1", "premade")]),
			page([voice("premade-1", "premade")]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		await port.listVisibleVoices(request(), {});
		vi.advanceTimersByTime(VOICE_CATALOG_TTL_MS + 1);
		await port.listVisibleVoices(request(), {});

		expect(calls).toHaveLength(2);
	});

	it("shares one in-flight read between concurrent callers", async () => {
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
		const second = port.listVisibleVoices(request(), {});

		await vi.waitFor(() => {
			expect(deferred.resolve).not.toBeNull();
		});
		deferred.resolve?.(page([voice("premade-1", "premade")]));
		await Promise.all([first, second]);

		expect(fetchCount).toBe(1);
	});

	it("does not cache a failed read", async () => {
		const { service } = createService();
		const { fetchVoices, calls } = createFetchVoices([
			new Error("upstream unavailable"),
			page([voice("premade-1", "premade")]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.assertCanUseVoice(request(), "premade-1")
		).rejects.toThrow("upstream unavailable");
		await expect(
			port.assertCanUseVoice(request(), "premade-1")
		).resolves.toBeUndefined();
		expect(calls).toHaveLength(2);
	});

	it("caps a runaway catalogue and warns through the logger", async () => {
		const { service } = createService();
		const steps: FetchStep[] = Array.from(
			{ length: VOICE_CATALOG_MAX_PAGES },
			(_, index) =>
				page([voice(`premade-${index + 1}`, "premade")], {
					has_more: true,
					next_page_token: `page-${index + 2}`,
				})
		);
		const { fetchVoices, calls } = createFetchVoices(steps);
		const { logger, warnings } = createLogger();
		const port = createVoiceAccess({ service, fetchVoices, logger });

		const response = await port.listVisibleVoices(request(), {});

		expect(calls).toHaveLength(VOICE_CATALOG_MAX_PAGES);
		expect(response.total_count).toBe(VOICE_CATALOG_MAX_PAGES);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain("capped");
	});
});

/* -------------------------------------------------------------------------- */
/*                             Clone invalidation                             */
/* -------------------------------------------------------------------------- */

describe("recordClonedVoice", () => {
	it("records the clone against the caller under the tenant", async () => {
		const { service, calls } = createService();
		const { fetchVoices } = createFetchVoices([page([])]);
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

	it("invalidates the catalogue so the clone is visible immediately", async () => {
		const { service } = createService();
		const { fetchVoices, calls } = createFetchVoices([
			page([voice("premade-1", "premade")]),
			page([voice("premade-1", "premade"), voice("clone-1", "cloned")]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		// Warm the cache without the clone.
		const before = await port.listVisibleVoices(request(), {});
		expect(before.voices.map((item) => item.voice_id)).toEqual([
			"premade-1",
		]);

		await port.recordClonedVoice(request(), {
			voice_id: "clone-1",
			name: "My Clone",
		});

		const after = await port.listVisibleVoices(request(), {});
		expect(calls).toHaveLength(2);
		expect(after.voices.map((item) => item.voice_id)).toEqual([
			"premade-1",
			"clone-1",
		]);
	});

	it("keeps the cached catalogue when the ledger write fails", async () => {
		const { service } = createService({
			recordError: new Error("ledger unavailable"),
		});
		const { fetchVoices, calls } = createFetchVoices([
			page([voice("premade-1", "premade")]),
		]);
		const port = createVoiceAccess({ service, fetchVoices });

		await port.listVisibleVoices(request(), {});
		await expect(
			port.recordClonedVoice(request(), {
				voice_id: "clone-1",
				name: "My Clone",
			})
		).rejects.toThrow("ledger unavailable");

		await port.listVisibleVoices(request(), {});
		expect(calls).toHaveLength(1);
	});
});

/* -------------------------------------------------------------------------- */
/*                                  Deletion                                  */
/* -------------------------------------------------------------------------- */

describe("deleteOwnedVoice", () => {
	it("deletes through the ledger under the caller", async () => {
		const { service, calls } = createService();
		const { fetchVoices } = createFetchVoices([page([])]);
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
		const { fetchVoices } = createFetchVoices([page([])]);
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
		const { service } = createService({ records: [resource("owned-1")] });
		const { fetchVoices } = createFetchVoices([page([])]);
		const port = createVoiceAccess({ service, fetchVoices });

		await expect(
			port.listOwnedVoiceIds(request(null))
		).rejects.toBeInstanceOf(VoiceAccessUnavailableError);
		await expect(
			port.listVisibleVoices(request(null), {})
		).rejects.toBeInstanceOf(VoiceAccessUnavailableError);
		await expect(
			port.recordClonedVoice(request(null), {
				voice_id: "voice-1",
				name: "Narrator",
			})
		).rejects.toBeInstanceOf(VoiceAccessUnavailableError);
	});
});
