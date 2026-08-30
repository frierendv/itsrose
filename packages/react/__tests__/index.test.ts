import * as ReactPkg from "../src";

describe("package root exports", () => {
	it("exports core utilities", () => {
		expect(ReactPkg.createContext).toBeDefined();
		expect(ReactPkg.forwardRef).toBeDefined();
		expect(ReactPkg.cn).toBeDefined();
		expect(ReactPkg.tv).toBeDefined();
	});

	it("exports hooks", () => {
		expect(ReactPkg.useIsMobile).toBeDefined();
	});

	it("exports navbar components", () => {
		expect(ReactPkg.Navbar).toBeDefined();
		expect(ReactPkg.NavbarRoot).toBeDefined();
		expect(ReactPkg.NavbarBrand).toBeDefined();
		expect(ReactPkg.NavbarContent).toBeDefined();
		expect(ReactPkg.NavbarItem).toBeDefined();
		expect(ReactPkg.NavbarMenu).toBeDefined();
		expect(ReactPkg.NavbarMenuItem).toBeDefined();
		expect(ReactPkg.NavbarMenuToggle).toBeDefined();
		expect(ReactPkg.useNavbar).toBeDefined();
	});
});
