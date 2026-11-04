import { describe, expect, it } from "@jest/globals";
import {
	getPaginationRange,
	toSortDescriptor,
	toSortingState,
} from "../table-utils";

describe("toSortDescriptor", () => {
	it("maps the first sorting entry to a HeroUI descriptor", () => {
		expect(toSortDescriptor([{ id: "invoice_date", desc: true }])).toEqual({
			column: "invoice_date",
			direction: "descending",
		});
		expect(toSortDescriptor([{ id: "amount", desc: false }])).toEqual({
			column: "amount",
			direction: "ascending",
		});
	});

	it("returns undefined when sorting is empty", () => {
		expect(toSortDescriptor([])).toBeUndefined();
	});
});

describe("toSortingState", () => {
	it("maps a HeroUI descriptor back to sorting state", () => {
		expect(
			toSortingState({ column: "invoice_date", direction: "descending" })
		).toEqual([{ desc: true, id: "invoice_date" }]);
		expect(
			toSortingState({ column: "amount", direction: "ascending" })
		).toEqual([{ desc: false, id: "amount" }]);
	});
});

describe("getPaginationRange", () => {
	it("computes 1-based visible ranges", () => {
		expect(getPaginationRange(30, 0, 10)).toEqual({ start: 1, end: 10 });
		expect(getPaginationRange(30, 2, 10)).toEqual({ start: 21, end: 30 });
	});

	it("clamps the last page to the total", () => {
		expect(getPaginationRange(25, 2, 10)).toEqual({ start: 21, end: 25 });
	});

	it("returns zeros for empty data", () => {
		expect(getPaginationRange(0, 0, 10)).toEqual({ start: 0, end: 0 });
	});
});
