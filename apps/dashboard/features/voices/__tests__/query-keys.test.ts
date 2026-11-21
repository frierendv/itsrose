import { voiceQueryKeys } from "../query-keys";

describe("voiceQueryKeys", () => {
	it("nests every key under the voices invalidation prefix", () => {
		const key = voiceQueryKeys.list();

		expect(key).toEqual(["voices", "list"]);
		expect(key.slice(0, voiceQueryKeys.all.length)).toEqual([
			...voiceQueryKeys.all,
		]);
		expect(voiceQueryKeys.details()).toEqual(["voices", "detail"]);
	});

	it("distinguishes one voice detail from another", () => {
		expect(voiceQueryKeys.detail("voice_01")).toEqual([
			"voices",
			"detail",
			"voice_01",
		]);
		expect(voiceQueryKeys.detail("voice_02")).not.toEqual(
			voiceQueryKeys.detail("voice_01")
		);
	});
});
