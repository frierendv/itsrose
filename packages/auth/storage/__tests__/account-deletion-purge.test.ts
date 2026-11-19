import type { StorageClient } from "@itsrose/s3";
import { vi } from "vitest";
import {
	DurableAssetPurgeError,
	purgeAccountStorageOnDelete,
	purgeUserDurableAssets,
	type AssetRegistryPurgePort,
} from "../src/purge";

type PurgeErrorEntry = { key: string; code?: string; message?: string };

type PurgeOutcome = { deleted: string[]; errors: PurgeErrorEntry[] };

type DeleteManyInput = {
	model: string;
	where: Array<{ field: string; value: string }>;
};

type HarnessOptions = {
	/** Canned `purgePrefix` answer; may throw to simulate a transport failure. */
	purge?: (prefix: string) => Promise<PurgeOutcome>;
	rowsDeleted?: number;
	rowError?: Error;
};

/**
 * Builds the two fakes the purge talks to and one shared event log, so the
 * tests can assert both the calls and their order.
 */
function createHarness(options: HarnessOptions = {}) {
	const events: string[] = [];
	const purgePrefix = vi.fn(async (prefix: string) => {
		events.push(`purge:${prefix}`);
		return options.purge
			? options.purge(prefix)
			: { deleted: [], errors: [] };
	});
	const deleteManyCalls: DeleteManyInput[] = [];
	const deleteMany = vi.fn(async (input: DeleteManyInput) => {
		events.push("deleteMany");
		deleteManyCalls.push(input);
		if (options.rowError) {
			throw options.rowError;
		}
		return options.rowsDeleted ?? 0;
	});

	const adapter: AssetRegistryPurgePort = { deleteMany };
	const s3 = { purgePrefix } as unknown as StorageClient;

	return {
		s3,
		adapter,
		purgePrefix,
		deleteMany,
		deleteManyCalls,
		events,
	};
}

describe("packages/auth/storage/purge", () => {
	describe("purgeUserDurableAssets", () => {
		it("purges the durable root, then deletes the registry rows", async () => {
			const harness = createHarness({
				rowsDeleted: 2,
				purge: async () => ({
					deleted: [
						"assets/users/u123/voice_sample/a/sample.wav",
						"assets/users/u123/voice_sample/b/sample.wav",
					],
					errors: [],
				}),
			});

			const result = await purgeUserDurableAssets({
				s3: harness.s3,
				adapter: harness.adapter,
				userId: "u123",
			});

			expect(result).toEqual({
				userId: "u123",
				objectsDeleted: 2,
				rowsDeleted: 2,
			});
			expect(harness.events).toEqual([
				"purge:assets/users/u123/",
				"deleteMany",
			]);
			expect(harness.deleteManyCalls).toEqual([
				{
					model: "asset_registry",
					where: [{ field: "user_id", value: "u123" }],
				},
			]);
		});

		it("keeps the registry rows and rejects when the object purge is incomplete", async () => {
			const harness = createHarness({
				purge: async () => ({
					deleted: ["assets/users/u123/voice_sample/a/sample.wav"],
					errors: [
						{
							key: "assets/users/u123/voice_sample/b/sample.wav",
							code: "AccessDenied",
							message: "Access denied.",
						},
					],
				}),
			});

			await expect(
				purgeUserDurableAssets({
					s3: harness.s3,
					adapter: harness.adapter,
					userId: "u123",
				})
			).rejects.toMatchObject({
				name: "DurableAssetPurgeError",
				stage: "objects",
				userId: "u123",
				remainingObjects: 1,
			});

			expect(harness.deleteManyCalls).toEqual([]);
		});

		it("keeps the registry rows and rejects when the object purge request fails", async () => {
			const harness = createHarness({
				purge: async () => {
					throw new Error("transport down");
				},
			});

			const error = await purgeUserDurableAssets({
				s3: harness.s3,
				adapter: harness.adapter,
				userId: "u123",
			}).catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(DurableAssetPurgeError);
			expect((error as DurableAssetPurgeError).stage).toBe("objects");
			expect(harness.deleteManyCalls).toEqual([]);
		});

		it("propagates a registry deletion failure after the objects are gone", async () => {
			const rowError = new Error("adapter down");
			const harness = createHarness({ rowError });

			const error = await purgeUserDurableAssets({
				s3: harness.s3,
				adapter: harness.adapter,
				userId: "u123",
			}).catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(DurableAssetPurgeError);
			expect((error as DurableAssetPurgeError).stage).toBe("registry");
			expect((error as DurableAssetPurgeError).cause).toBe(rowError);
			expect(harness.events).toEqual([
				"purge:assets/users/u123/",
				"deleteMany",
			]);
		});
	});

	describe("purgeAccountStorageOnDelete", () => {
		it("purges both roots and the rows, warning about nothing", async () => {
			const harness = createHarness({ rowsDeleted: 1 });
			const logger = { warn: vi.fn(), error: vi.fn() };

			await purgeAccountStorageOnDelete("u123", {
				s3: harness.s3,
				adapter: harness.adapter,
				logger,
			});

			await vi.waitFor(() => {
				expect(harness.purgePrefix).toHaveBeenCalledWith(
					"t/users/u123/"
				);
			});
			expect(harness.purgePrefix).toHaveBeenCalledWith(
				"assets/users/u123/"
			);
			expect(harness.deleteManyCalls).toHaveLength(1);
			expect(logger.warn).not.toHaveBeenCalled();
			expect(logger.error).not.toHaveBeenCalled();
		});

		it("logs a durable failure at error level with the user and stage without throwing", async () => {
			const harness = createHarness({
				purge: async (prefix) =>
					prefix.startsWith("assets/")
						? {
								deleted: [],
								errors: [{ key: "asset-key" }],
							}
						: { deleted: [], errors: [] },
			});
			const logger = { warn: vi.fn(), error: vi.fn() };

			await expect(
				purgeAccountStorageOnDelete("u123", {
					s3: harness.s3,
					adapter: harness.adapter,
					logger,
				})
			).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalledTimes(1);
			const call = logger.error.mock.calls[0];
			expect(call?.[0]).toContain("u123");
			expect(call?.[0]).toContain('stage "objects"');
			expect(call?.[1]).toBeInstanceOf(DurableAssetPurgeError);

			await vi.waitFor(() => {
				expect(logger.warn).not.toHaveBeenCalled();
				expect(harness.purgePrefix).toHaveBeenCalledWith(
					"t/users/u123/"
				);
			});
		});

		it("leaves the ephemeral purge best-effort when it fails", async () => {
			const harness = createHarness({
				rowsDeleted: 1,
				purge: async (prefix) => {
					if (prefix.startsWith("t/")) {
						throw new Error("ephemeral down");
					}
					return { deleted: [], errors: [] };
				},
			});
			const logger = { warn: vi.fn(), error: vi.fn() };

			await expect(
				purgeAccountStorageOnDelete("u123", {
					s3: harness.s3,
					adapter: harness.adapter,
					logger,
				})
			).resolves.toBeUndefined();

			await vi.waitFor(() => {
				expect(logger.warn).toHaveBeenCalledTimes(1);
			});
			const call = logger.warn.mock.calls[0];
			expect(call?.[0]).toContain("u123");
			expect(call?.[1]).toBeInstanceOf(Error);
			expect(logger.error).not.toHaveBeenCalled();
			expect(harness.deleteManyCalls).toHaveLength(1);
		});

		it("skips both roots when autoPurgeOnAccountDelete is false", async () => {
			const harness = createHarness({ rowsDeleted: 1 });

			await purgeAccountStorageOnDelete("u123", {
				s3: harness.s3,
				adapter: harness.adapter,
				autoPurgeOnAccountDelete: false,
			});

			expect(harness.purgePrefix).not.toHaveBeenCalled();
			expect(harness.deleteManyCalls).toEqual([]);
		});
	});
});
