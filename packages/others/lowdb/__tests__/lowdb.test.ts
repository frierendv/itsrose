import { promises as fs } from "node:fs";
import { join } from "node:path";
import * as atomically from "atomically";
import { Adapter, CryptoAdapter, Low, SuperJSONAdapter } from "../src";
import { Document } from "../src/low/document";
import { isNodeError, isNotFoundOrNotDir } from "../src/utils";

type TestDBSchema = {
	users: { id: string; name: string; createdAt: Date };
};

class TestSubAdapter<T extends Record<string, any>> extends Adapter<T> {
	constructor(options?: any) {
		super(options);
	}
}

describe("others/lowdb", () => {
	const testDir = join(__dirname, ".tmp-lowdb");

	beforeAll(async () => {
		await fs.mkdir(testDir, { recursive: true });
	});

	afterAll(async () => {
		await fs.rm(testDir, { recursive: true, force: true });
	});

	it("creates and performs CRUD operations on collection with SuperJSONAdapter", async () => {
		const adapter = new SuperJSONAdapter<TestDBSchema["users"]>({
			rootDir: testDir,
		});
		const db = new Low<TestDBSchema>(adapter);

		const now = new Date();
		const user = { id: "user1", name: "Alice", createdAt: now };

		// Set
		await db.handler.users.set("user1", user);

		// Get
		const fetched = await db.handler.users.get("user1");
		expect(fetched).toBeDefined();
		expect(fetched?.name).toBe("Alice");
		expect(fetched?.createdAt).toBeInstanceOf(Date);

		// Keys
		const keys = await db.handler.users.keys();
		expect(keys).toContain("user1");

		// Entries
		const entries = await db.handler.users.entries();
		expect(entries.length).toBe(1);
		expect(entries[0]![0]).toBe("user1");
		expect(entries[0]![1].name).toBe("Alice");

		// Access handler with Symbol property returns undefined
		expect((db.handler as any)[Symbol("test")]).toBeUndefined();

		// Delete
		await db.handler.users.delete("user1");
		const deleted = await db.handler.users.get("user1");
		expect(deleted.name).toBeUndefined();
	});

	it("handles Adapter default options, entries, and error branches", async () => {
		const adapter = new TestSubAdapter<any>();

		// Keys on non-existent collection returns empty array
		const keys = await adapter.keys("non_existent_collection_123");
		expect(keys).toEqual([]);

		// Delete non-existent key triggers ENOENT catch (lines 101-103)
		await adapter.delete("non_existent_col", "non_existent_key");

		// Entries on non-existent collection returns empty array
		const entries = await adapter.entries("non_existent_collection_123");
		expect(entries).toEqual([]);

		// Set and entries
		await adapter.set("testcol", "k1", { val: 1 });
		const colEntries = await adapter.entries("testcol");
		expect(colEntries).toEqual([["k1", { val: 1 }]]);

		// Test entries filtering null when get returns undefined for a key (line 133)
		jest.spyOn(adapter, "keys").mockResolvedValue(["k1", "k2"]);
		jest.spyOn(adapter, "get").mockImplementation(async (_col, key) =>
			key === "k1" ? { val: 1 } : undefined
		);
		const filteredEntries = await adapter.entries("testcol");
		expect(filteredEntries).toEqual([["k1", { val: 1 }]]);
		jest.restoreAllMocks();

		// Cleanup default directory
		await fs.rm("data", { recursive: true, force: true });

		// Non-ENOENT error in get, delete, keys
		const errAdapter = new TestSubAdapter<any>({ rootDir: testDir });
		jest.spyOn(atomically, "readFile").mockRejectedValue(
			new Error("Permission denied")
		);
		await expect(errAdapter.get("col", "k")).rejects.toThrow(
			"Permission denied"
		);
		jest.restoreAllMocks();

		jest.spyOn(fs, "unlink").mockRejectedValue(new Error("Disk error"));
		await expect(errAdapter.delete("col", "k")).rejects.toThrow(
			"Disk error"
		);
		jest.restoreAllMocks();

		jest.spyOn(fs, "readdir").mockRejectedValue(new Error("Access error"));
		await expect(errAdapter.keys("col")).rejects.toThrow("Access error");
		jest.restoreAllMocks();
	});

	it("handles CryptoAdapter encryption and decryption", async () => {
		const cryptoDir = join(testDir, "crypto");
		const key = "my-super-secret-key";
		const adapter = new CryptoAdapter<TestDBSchema["users"]>({
			rootDir: cryptoDir,
			secretKey: key,
		});

		const user = { id: "u2", name: "Bob", createdAt: new Date() };

		// Set and Get
		await adapter.set("users", "u2", user);
		const fetched = await adapter.get("users", "u2");
		expect(fetched?.id).toBe("u2");
		expect(fetched?.name).toBe("Bob");

		// Get non-existent
		const nonExistent = await adapter.get("users", "u999");
		expect(nonExistent).toBeUndefined();

		// Get throwing non-ENOENT error
		jest.spyOn(atomically, "readFile").mockRejectedValue(
			new Error("Crypto read fail")
		);
		await expect(adapter.get("users", "u2")).rejects.toThrow(
			"Crypto read fail"
		);
		jest.restoreAllMocks();

		// Constructor with valid 32-byte Buffer key
		const bufKey = Buffer.alloc(32, "a");
		const adapterBuf = new CryptoAdapter<TestDBSchema["users"]>({
			rootDir: cryptoDir,
			secretKey: bufKey as unknown as string,
		});
		expect(adapterBuf).toBeDefined();

		// Constructor throws error for invalid Buffer key length
		const invalidBufKey = Buffer.alloc(16, "a");
		expect(
			() =>
				new CryptoAdapter({
					rootDir: cryptoDir,
					secretKey: invalidBufKey as unknown as string,
				})
		).toThrow("Raw Buffer keys must be exactly 32 bytes long.");
	});

	it("handles Document class and proxy interactions including existing property mutation", async () => {
		const docDir = join(testDir, "doc");
		const adapter = new TestSubAdapter<{ id: string; name: string }>({
			rootDir: docDir,
		});

		// Read new document
		const doc = await Document.read<{ id: string; name: string }>(
			"users",
			"doc1",
			adapter
		);

		// Access non-function property existing on Document target (line 17)
		expect((doc as any).toJSON).toBeDefined(); // function
		expect((doc as any).isDirty).toBe(false); // non-function property

		// Mutate existing Document property on proxy
		const markDirtyFn = doc.markDirty;
		doc.markDirty = markDirtyFn;

		// Mutate via proxy
		doc.id = "doc1";
		doc.name = "Charlie";
		expect(doc.name).toBe("Charlie");
		expect(doc.toJSON()).toEqual({ id: "doc1", name: "Charlie" });

		// Save and verify storage
		await doc.save();
		const stored = await adapter.get("users", "doc1");
		expect(stored).toEqual({ id: "doc1", name: "Charlie" });

		// Save again when not dirty (no-op)
		await doc.save();

		// Update via doc.set
		doc.set({ id: "doc1", name: "Updated Charlie" });
		await doc[Symbol.asyncDispose](); // saves if dirty

		const reFetched = await adapter.get("users", "doc1");
		expect(reFetched?.name).toBe("Updated Charlie");

		// Async dispose when not dirty
		await doc[Symbol.asyncDispose]();

		// Delete document
		await doc.delete();
		const afterDelete = await adapter.get("users", "doc1");
		expect(afterDelete).toBeUndefined();
	});

	it("handles fs utils type guards", () => {
		expect(isNodeError(new Error("custom"))).toBe(false);
		expect(isNotFoundOrNotDir(new Error("custom"))).toBe(false);

		// Node error with code !== ENOENT/ENOTDIR (line 14 branch)
		const otherErr: any = new Error("other");
		otherErr.code = "EACCES";
		expect(isNodeError(otherErr)).toBe(true);
		expect(isNotFoundOrNotDir(otherErr)).toBe(false);
	});
});
