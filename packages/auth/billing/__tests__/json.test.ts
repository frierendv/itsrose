import { parseJson } from "../src/schema/json";

describe("parseJson", () => {
	it("parses valid JSON", () => {
		expect(parseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
	});

	it("returns null for invalid JSON", () => {
		expect(parseJson("{nope")).toBeNull();
	});
});
