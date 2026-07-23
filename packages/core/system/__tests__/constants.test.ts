import { BASE_URL, NAME, USER_AGENT, VERSION } from "../src/constants";

describe("core/system constants", () => {
	it("exports system constants", () => {
		expect(NAME).toBe("ItsRose");
		expect(VERSION).toBe("1.0.0");
		expect(BASE_URL).toContain("github.com");
		expect(USER_AGENT).toContain(NAME);
		expect(USER_AGENT).toContain(VERSION);
	});
});
