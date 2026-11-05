import {
	buildAdminTableSearch,
	clearAdminTableFilters,
	parseAdminTableState,
} from "../table-state";

const DEFAULTS = {
	filters: { status: "all", by: "endpoint" },
};

function parse(search: string) {
	return parseAdminTableState(new URLSearchParams(search), DEFAULTS);
}

describe("parseAdminTableState", () => {
	it("reads search, known filters and the inspector", () => {
		expect(parse("?q=acme&status=active&inspect=sub_1")).toEqual({
			q: "acme",
			filters: { status: "active" },
			inspect: "sub_1",
		});
	});

	it("drops default, blank and unknown values", () => {
		expect(parse("?q=&status=all&by=endpoint&unknown=1&inspect=")).toEqual({
			q: "",
			filters: {},
			inspect: null,
		});
	});

	it("trims values", () => {
		expect(parse("?q=%20acme%20&status=%20active%20")).toEqual({
			q: "acme",
			filters: { status: "active" },
			inspect: null,
		});
	});

	it("handles an empty query string", () => {
		expect(parse("")).toEqual({ q: "", filters: {}, inspect: null });
	});
});

describe("buildAdminTableSearch", () => {
	it("round-trips through parse", () => {
		const state = {
			q: "acme",
			filters: { status: "active" },
			inspect: "sub_1",
		};
		expect(parse(buildAdminTableSearch(state, DEFAULTS))).toEqual(state);
	});

	it("omits defaults and returns an empty string when empty", () => {
		expect(
			buildAdminTableSearch(
				{ q: "", filters: { status: "all" }, inspect: null },
				DEFAULTS
			)
		).toBe("");
	});

	it("sorts filter keys deterministically", () => {
		expect(
			buildAdminTableSearch(
				{
					q: "",
					filters: { by: "api_key", status: "expired" },
					inspect: null,
				},
				DEFAULTS
			)
		).toBe("?by=api_key&status=expired");
	});

	it("encodes reserved characters", () => {
		expect(
			buildAdminTableSearch(
				{ q: "a&b=c", filters: {}, inspect: null },
				DEFAULTS
			)
		).toBe("?q=a%26b%3Dc");
	});
});

describe("clearAdminTableFilters", () => {
	it("keeps the inspector while clearing search and filters", () => {
		expect(
			clearAdminTableFilters(
				{ q: "x", filters: { status: "active" }, inspect: "inv_1" },
				DEFAULTS
			)
		).toEqual({ q: "", filters: {}, inspect: "inv_1" });
	});
});
