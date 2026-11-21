import { studioQueryKeys } from "../query-keys";

describe("studioQueryKeys", () => {
	it("nests every generation key under the studio prefix", () => {
		const key = studioQueryKeys.generations.list({
			limit: 20,
			offset: 40,
		});

		expect(key).toEqual(["studio", "generations", "list", "all", 20, 40]);
		expect(key.slice(0, studioQueryKeys.all.length)).toEqual([
			...studioQueryKeys.all,
		]);
		expect(studioQueryKeys.generations.all()).toEqual([
			"studio",
			"generations",
		]);
	});

	it("distinguishes the feature filter and pagination", () => {
		const unfiltered = studioQueryKeys.generations.list({
			limit: 20,
			offset: 0,
		});

		expect(
			studioQueryKeys.generations.list({
				feature: "text_to_speech",
				limit: 20,
				offset: 0,
			})
		).not.toEqual(unfiltered);
		expect(
			studioQueryKeys.generations.list({ limit: 20, offset: 20 })
		).not.toEqual(unfiltered);
	});

	it("keeps details under the generations invalidation prefix", () => {
		const key = studioQueryKeys.generations.detail("gen_01");

		expect(key).toEqual(["studio", "generations", "detail", "gen_01"]);
		expect(key.slice(0, studioQueryKeys.generations.all().length)).toEqual([
			...studioQueryKeys.generations.all(),
		]);
		expect(studioQueryKeys.generations.detail("gen_02")).not.toEqual(key);
	});
});
