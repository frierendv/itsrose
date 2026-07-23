import { promises as fs } from "node:fs";
import { join } from "node:path";
import { Low, SuperJSONAdapter } from "../src";

type TestDBSchema = {
	users: { id: string; name: string; createdAt: Date };
};

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

		// Delete
		await db.handler.users.delete("user1");
		const deleted = await db.handler.users.get("user1");
		expect(deleted.name).toBeUndefined();
	});
});
