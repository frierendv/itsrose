import { speechQueryKeys } from "../query-keys";

describe("speechQueryKeys", () => {
	it("nests every generation key under the speech prefix", () => {
		const key = speechQueryKeys.generations.list({
			limit: 20,
			offset: 40,
		});

		expect(key).toEqual(["speech", "generations", "list", "all", 20, 40]);
		expect(key.slice(0, speechQueryKeys.all.length)).toEqual([
			...speechQueryKeys.all,
		]);
		expect(speechQueryKeys.generations.all()).toEqual([
			"speech",
			"generations",
		]);
	});

	it("distinguishes the feature filter and pagination", () => {
		const unfiltered = speechQueryKeys.generations.list({
			limit: 20,
			offset: 0,
		});

		expect(
			speechQueryKeys.generations.list({
				feature: "text_to_speech",
				limit: 20,
				offset: 0,
			})
		).not.toEqual(unfiltered);
		expect(
			speechQueryKeys.generations.list({ limit: 20, offset: 20 })
		).not.toEqual(unfiltered);
	});

	it("keeps details under the generations invalidation prefix", () => {
		const key = speechQueryKeys.generations.detail("gen_01");

		expect(key).toEqual(["speech", "generations", "detail", "gen_01"]);
		expect(key.slice(0, speechQueryKeys.generations.all().length)).toEqual([
			...speechQueryKeys.generations.all(),
		]);
		expect(speechQueryKeys.generations.detail("gen_02")).not.toEqual(key);
	});
});
