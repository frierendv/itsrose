import { StorageValidationError } from "@itsrose/s3";
import {
	AssetCapExceededError,
	AssetNotFoundError,
	createAssetService,
	type AssetEntitlementPort,
	type AssetObjectPutInput,
	type AssetObjectStorePort,
	type StorageAllowance,
	type UploadAssetInput,
} from "../src/application/assets";
import { SIGNED_READ_TTL_SECONDS } from "../src/policy";
import type {
	AssetListOptions,
	AssetRecord,
	AssetRegistryPort,
	AssetUsage,
} from "../src/types";

const ASSET_ID = "asset-1";
const CLOCK = new Date("2026-11-19T04:00:00.000Z");
const BODY = Buffer.from("hello");
const ASSET_KEY = `assets/users/user-1/voice_sample/${ASSET_ID}/sample.wav`;

const UNLIMITED: StorageAllowance = {
	storage_bytes: null,
	storage_assets: null,
};

/* -------------------------------------------------------------------------- */
/*                               Fake harness                                 */
/* -------------------------------------------------------------------------- */

type Event = "put" | "insert" | "remove" | "softDelete" | "presignGet";

type RegistryCalls = {
	insert: AssetRecord[];
	findById: string[];
	listForUser: Array<{ userId: string; options: AssetListOptions }>;
	softDelete: Array<{ assetId: string; at: Date }>;
	sumUsage: string[];
};

type ObjectCalls = {
	put: AssetObjectPutInput[];
	remove: string[];
	presignGet: Array<{ key: string; ttlSeconds: number }>;
};

type HarnessOptions = {
	allowance?: StorageAllowance;
	usage?: AssetUsage;
	records?: AssetRecord[];
	/** Canned result of `listForUser`; the service must pass it through. */
	listResult?: AssetRecord[];
	insertError?: Error;
	removeObjectError?: Error;
	softDeleteResult?: boolean;
	presignUrl?: string;
};

type Harness = {
	service: ReturnType<typeof createAssetService>;
	events: Event[];
	registryCalls: RegistryCalls;
	objectCalls: ObjectCalls;
	entitlementCalls: string[];
	records: Map<string, AssetRecord>;
};

/**
 * Builds the service against recording fakes: every port answers from memory,
 * remembers its calls, and appends to one shared event log so ordering across
 * ports can be asserted.
 */
function createHarness(options: HarnessOptions = {}): Harness {
	const events: Event[] = [];
	const records = new Map(
		(options.records ?? []).map((record) => [record.asset_id, record])
	);
	const registryCalls: RegistryCalls = {
		insert: [],
		findById: [],
		listForUser: [],
		softDelete: [],
		sumUsage: [],
	};
	const objectCalls: ObjectCalls = { put: [], remove: [], presignGet: [] };
	const entitlementCalls: string[] = [];

	const registry: AssetRegistryPort = {
		async insert(record) {
			events.push("insert");
			registryCalls.insert.push(record);
			if (options.insertError) {
				throw options.insertError;
			}
			return record;
		},
		async findById(assetId) {
			registryCalls.findById.push(assetId);
			return records.get(assetId) ?? null;
		},
		async listForUser(userId, listOptions) {
			registryCalls.listForUser.push({ userId, options: listOptions });
			return (
				options.listResult ??
				[...records.values()].filter(
					(record) =>
						record.user_id === userId && record.deleted_at === null
				)
			);
		},
		async softDelete(assetId, at) {
			events.push("softDelete");
			registryCalls.softDelete.push({ assetId, at });
			if (options.softDeleteResult === false) {
				return false;
			}
			const existing = records.get(assetId);
			if (existing) {
				records.set(assetId, { ...existing, deleted_at: at });
			}
			return true;
		},
		async sumUsage(tenantId) {
			registryCalls.sumUsage.push(tenantId);
			return options.usage ?? { bytes: 0, assets: 0 };
		},
	};

	const objects: AssetObjectStorePort = {
		async put(input) {
			events.push("put");
			objectCalls.put.push(input);
		},
		async remove(key) {
			events.push("remove");
			objectCalls.remove.push(key);
			if (options.removeObjectError) {
				throw options.removeObjectError;
			}
		},
		async presignGet(key, ttlSeconds) {
			events.push("presignGet");
			objectCalls.presignGet.push({ key, ttlSeconds });
			return options.presignUrl ?? `https://signed.example/${key}`;
		},
	};

	const entitlements: AssetEntitlementPort = {
		async forUser(userId) {
			entitlementCalls.push(userId);
			return options.allowance ?? UNLIMITED;
		},
	};

	const service = createAssetService({
		registry,
		objects,
		entitlements,
		clock: () => CLOCK,
		newId: () => ASSET_ID,
	});

	return {
		service,
		events,
		registryCalls,
		objectCalls,
		entitlementCalls,
		records,
	};
}

function uploadInput(
	overrides: Partial<UploadAssetInput> = {}
): UploadAssetInput {
	return {
		userId: "user-1",
		tenantId: "tenant-1",
		kind: "voice_sample",
		filename: "sample.wav",
		body: BODY,
		contentType: "audio/wav",
		...overrides,
	};
}

function liveRecord(overrides: Partial<AssetRecord> = {}): AssetRecord {
	return {
		asset_id: ASSET_ID,
		user_id: "user-1",
		tenant_id: "tenant-1",
		kind: "voice_sample",
		key: ASSET_KEY,
		filename: "sample.wav",
		size_bytes: 5,
		content_type: "audio/wav",
		status: "ready",
		created_at: CLOCK,
		deleted_at: null,
		...overrides,
	};
}

/** Captures a rejection so its concrete class and fields can be asserted. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	throw new Error("Expected the call to reject.");
}

/* -------------------------------------------------------------------------- */
/*                                  Uploads                                   */
/* -------------------------------------------------------------------------- */

describe("packages/auth/storage/application/assets", () => {
	describe("upload", () => {
		it("writes the object before the ready row and returns the stored record", async () => {
			const harness = createHarness();

			const record = await harness.service.upload(uploadInput());

			expect(record).toEqual({
				asset_id: ASSET_ID,
				user_id: "user-1",
				tenant_id: "tenant-1",
				kind: "voice_sample",
				key: ASSET_KEY,
				filename: "sample.wav",
				size_bytes: 5,
				content_type: "audio/wav",
				status: "ready",
				created_at: CLOCK,
				deleted_at: null,
			});
			expect(harness.events).toEqual(["put", "insert"]);
			expect(harness.objectCalls.put).toEqual([
				{
					key: ASSET_KEY,
					body: BODY,
					contentType: "audio/wav",
				},
			]);
			expect(harness.registryCalls.insert).toEqual([record]);
			expect(harness.entitlementCalls).toEqual(["user-1"]);
			expect(harness.registryCalls.sumUsage).toEqual(["tenant-1"]);
		});

		it("allows an upload that lands exactly on the byte allowance", async () => {
			const harness = createHarness({
				allowance: { storage_bytes: 10, storage_assets: null },
				usage: { bytes: 5, assets: 0 },
			});

			const record = await harness.service.upload(uploadInput());

			expect(record.size_bytes).toBe(5);
			expect(harness.events).toEqual(["put", "insert"]);
		});

		it("rejects an upload one byte over the byte allowance before writing", async () => {
			const harness = createHarness({
				allowance: { storage_bytes: 9, storage_assets: null },
				usage: { bytes: 5, assets: 0 },
			});

			const error = await rejection(
				harness.service.upload(uploadInput())
			);

			expect(error).toBeInstanceOf(AssetCapExceededError);
			expect(error).toMatchObject({ cap: "bytes" });
			expect(harness.events).toEqual([]);
			expect(harness.registryCalls.insert).toEqual([]);
		});

		it("rejects an upload that would exceed the asset-count allowance", async () => {
			const harness = createHarness({
				allowance: { storage_bytes: null, storage_assets: 2 },
				usage: { bytes: 0, assets: 2 },
			});

			const error = await rejection(
				harness.service.upload(uploadInput())
			);

			expect(error).toBeInstanceOf(AssetCapExceededError);
			expect(error).toMatchObject({ cap: "assets" });
			expect(harness.events).toEqual([]);
		});

		it("treats a null allowance as unlimited on both caps", async () => {
			const harness = createHarness({
				allowance: { storage_bytes: null, storage_assets: null },
				usage: { bytes: 10_000_000, assets: 500 },
			});

			const record = await harness.service.upload(uploadInput());

			expect(record.asset_id).toBe(ASSET_ID);
			expect(harness.events).toEqual(["put", "insert"]);
		});

		it("rejects an unknown kind with the shared validation error and writes nothing", async () => {
			const harness = createHarness();

			const error = await rejection(
				harness.service.upload(uploadInput({ kind: "recording" }))
			);

			expect(error).toBeInstanceOf(StorageValidationError);
			expect(harness.events).toEqual([]);
			expect(harness.entitlementCalls).toEqual([]);
			expect(harness.registryCalls.sumUsage).toEqual([]);
		});

		it("removes the object and rethrows when the registry insert fails", async () => {
			const failure = new Error("registry unavailable");
			const harness = createHarness({ insertError: failure });

			const error = await rejection(
				harness.service.upload(uploadInput())
			);

			expect(error).toBe(failure);
			expect(harness.events).toEqual(["put", "insert", "remove"]);
			expect(harness.objectCalls.remove).toEqual([ASSET_KEY]);
		});
	});

	/* ---------------------------------------------------------------------- */
	/*                                  List                                  */
	/* ---------------------------------------------------------------------- */

	describe("list", () => {
		it("passes the page window through to the registry", async () => {
			const harness = createHarness({ listResult: [liveRecord()] });

			const result = await harness.service.list({
				userId: "user-1",
				limit: 25,
				offset: 50,
			});

			expect(harness.registryCalls.listForUser).toEqual([
				{ userId: "user-1", options: { limit: 25, offset: 50 } },
			]);
			expect(result).toEqual([liveRecord()]);
		});
	});

	/* ---------------------------------------------------------------------- */
	/*                                Read URL                                */
	/* ---------------------------------------------------------------------- */

	describe("readUrl", () => {
		it("mints a signed URL for the owner", async () => {
			const harness = createHarness({ records: [liveRecord()] });

			const result = await harness.service.readUrl({
				userId: "user-1",
				assetId: ASSET_ID,
			});

			expect(result).toEqual({
				url: `https://signed.example/${ASSET_KEY}`,
				expires_in: SIGNED_READ_TTL_SECONDS,
			});
			expect(harness.objectCalls.presignGet).toEqual([
				{ key: ASSET_KEY, ttlSeconds: SIGNED_READ_TTL_SECONDS },
			]);
		});

		it("reports a missing asset as not found", async () => {
			const harness = createHarness();

			const error = await rejection(
				harness.service.readUrl({ userId: "user-1", assetId: ASSET_ID })
			);

			expect(error).toBeInstanceOf(AssetNotFoundError);
			expect(error).toMatchObject({ assetId: ASSET_ID });
			expect(harness.objectCalls.presignGet).toEqual([]);
		});

		it("reports a soft-deleted asset as not found", async () => {
			const harness = createHarness({
				records: [liveRecord({ deleted_at: CLOCK })],
			});

			const error = await rejection(
				harness.service.readUrl({ userId: "user-1", assetId: ASSET_ID })
			);

			expect(error).toBeInstanceOf(AssetNotFoundError);
			expect(harness.objectCalls.presignGet).toEqual([]);
		});

		it("reports another user's asset as not found", async () => {
			const harness = createHarness({
				records: [liveRecord({ user_id: "user-2" })],
			});

			const error = await rejection(
				harness.service.readUrl({ userId: "user-1", assetId: ASSET_ID })
			);

			expect(error).toBeInstanceOf(AssetNotFoundError);
			expect(harness.objectCalls.presignGet).toEqual([]);
		});
	});

	/* ---------------------------------------------------------------------- */
	/*                                 Remove                                 */
	/* ---------------------------------------------------------------------- */

	describe("remove", () => {
		it("deletes the object before soft-deleting the row", async () => {
			const harness = createHarness({ records: [liveRecord()] });

			const removed = await harness.service.remove({
				userId: "user-1",
				assetId: ASSET_ID,
			});

			expect(removed).toBe(true);
			expect(harness.events).toEqual(["remove", "softDelete"]);
			expect(harness.objectCalls.remove).toEqual([ASSET_KEY]);
			expect(harness.registryCalls.softDelete).toEqual([
				{ assetId: ASSET_ID, at: CLOCK },
			]);
		});

		it("leaves the row live when the object delete fails", async () => {
			const failure = new Error("object store unavailable");
			const harness = createHarness({
				records: [liveRecord()],
				removeObjectError: failure,
			});

			const error = await rejection(
				harness.service.remove({ userId: "user-1", assetId: ASSET_ID })
			);

			expect(error).toBe(failure);
			expect(harness.events).toEqual(["remove"]);
			expect(harness.registryCalls.softDelete).toEqual([]);
			expect(harness.records.get(ASSET_ID)?.deleted_at).toBeNull();
		});

		it("returns false when the row is already deleted", async () => {
			const harness = createHarness({
				records: [liveRecord({ deleted_at: CLOCK })],
			});

			const removed = await harness.service.remove({
				userId: "user-1",
				assetId: ASSET_ID,
			});

			expect(removed).toBe(false);
			expect(harness.events).toEqual([]);
			expect(harness.registryCalls.softDelete).toEqual([]);
		});

		it("reports a missing or foreign asset as not found without deleting", async () => {
			const missing = createHarness();
			const missingError = await rejection(
				missing.service.remove({ userId: "user-1", assetId: ASSET_ID })
			);
			expect(missingError).toBeInstanceOf(AssetNotFoundError);
			expect(missing.events).toEqual([]);

			const foreign = createHarness({
				records: [liveRecord({ user_id: "user-2" })],
			});
			const foreignError = await rejection(
				foreign.service.remove({ userId: "user-1", assetId: ASSET_ID })
			);
			expect(foreignError).toBeInstanceOf(AssetNotFoundError);
			expect(foreign.events).toEqual([]);
		});
	});
});
