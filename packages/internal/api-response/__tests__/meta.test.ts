import { extractMeta, mergeMeta } from "../src";

describe("internal/api-response meta", () => {
	it("mergeMeta combines only record-like values", () => {
		const merged = mergeMeta(
			{ base: true },
			null as unknown as { extra: boolean }
		);

		expect(merged).toEqual({ base: true });
	});

	it("extractMeta preserves primitives and empty meta", () => {
		const { payload, meta } = extractMeta(5);

		expect(payload).toBe(5);
		expect(meta).toEqual({});
	});

	it("extractMeta strips non-object meta field", () => {
		const { payload, meta } = extractMeta({
			value: 2,
			meta: "not-an-object",
		});

		expect(payload).toEqual({ value: 2 });
		expect(meta).toEqual({});
	});
});
