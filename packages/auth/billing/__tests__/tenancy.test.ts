import { createBillingRepositories } from "../src/adapter/repository";
import { ensureAllPersonalTenants } from "../src/application/tenancy.service";

function createAdapterStub(seed: Record<string, unknown>[] = []) {
	const rows = [...seed];
	const adapter = {
		create: jest.fn(
			async ({
				data,
			}: {
				model: string;
				data: Record<string, unknown>;
			}) => {
				const row = { id: `generated-${rows.length + 1}`, ...data };
				rows.push(row);
				return row;
			}
		),
		delete: jest.fn(async () => {}),
		findMany: jest.fn(async ({ model }: { model: string }) =>
			model === "user" ? [{ id: "user-1" }] : rows
		),
		findOne: jest.fn(
			async ({
				where,
			}: {
				model: string;
				where: Array<{ field: string; value: unknown }>;
			}) => {
				const match = rows.find((row) =>
					where.every((entry) => row[entry.field] === entry.value)
				);
				return match ?? null;
			}
		),
		update: jest.fn(
			async ({
				where,
				update,
			}: {
				where: Array<{ field: string; value: unknown }>;
				update: Record<string, unknown>;
			}) => {
				const row = rows.find((item) =>
					where.every((entry) => item[entry.field] === entry.value)
				);
				if (!row) {
					return null;
				}
				Object.assign(row, update);
				return row;
			}
		),
	};
	return { adapter, rows };
}

describe("personal tenant provisioning", () => {
	it("persists the derived tenant id instead of a generated one", async () => {
		const { adapter, rows } = createAdapterStub();
		const repositories = createBillingRepositories({
			adapter: adapter as never,
			secondaryStorage: null,
		});

		const result = await ensureAllPersonalTenants(
			repositories,
			(userId) => `derived-${userId}`,
			10
		);

		expect(result).toEqual({ scanned: 1, created: 1 });
		expect(adapter.create).toHaveBeenCalledWith(
			expect.objectContaining({
				model: "tenants",
				forceAllowId: true,
				data: expect.objectContaining({ id: "derived-user-1" }),
			})
		);
		expect(rows.find((row) => row.id === "derived-user-1")).toBeTruthy();
	});

	it("is idempotent for an existing tenant", async () => {
		const { adapter, rows } = createAdapterStub([
			{
				id: "derived-user-1",
				kind: "personal",
				name: "Personal workspace",
				owner_user_id: "user-1",
			},
		]);
		const repositories = createBillingRepositories({
			adapter: adapter as never,
			secondaryStorage: null,
		});

		const result = await ensureAllPersonalTenants(
			repositories,
			(userId) => `derived-${userId}`,
			10
		);

		expect(result.created).toBe(0);
		expect(rows.filter((row) => row.kind === "personal")).toHaveLength(1);
	});
});
