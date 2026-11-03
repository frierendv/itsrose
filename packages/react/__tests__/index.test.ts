import * as ReactPkg from "../src";

describe("package root exports", () => {
	it("exports core utilities", () => {
		expect(ReactPkg.createContext).toBeDefined();
		expect(ReactPkg.forwardRef).toBeDefined();
		expect(ReactPkg.cn).toBeDefined();
		expect(ReactPkg.tv).toBeDefined();
	});
});
