import { describe, expect, it } from "@jest/globals";
import { getErrorMessage } from "../errors";

describe("getErrorMessage", () => {
	it("reads Error instances", () => {
		expect(getErrorMessage(new Error("boom"), "fallback")).toBe("boom");
	});

	it("reads plain objects with a string message", () => {
		expect(
			getErrorMessage({ message: "rpc failed", status: 400 }, "fallback")
		).toBe("rpc failed");
	});

	it("ignores non-string message fields", () => {
		expect(getErrorMessage({ message: 42 }, "fallback")).toBe("fallback");
		expect(getErrorMessage({ message: "" }, "fallback")).toBe("fallback");
	});

	it("falls back for error-less values", () => {
		expect(getErrorMessage("a string", "fallback")).toBe("fallback");
		expect(getErrorMessage(null, "fallback")).toBe("fallback");
		expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
		expect(getErrorMessage(0, "fallback")).toBe("fallback");
		expect(getErrorMessage({ code: 1 }, "fallback")).toBe("fallback");
	});

	it("falls back for empty Error messages", () => {
		expect(getErrorMessage(new Error(""), "fallback")).toBe("fallback");
	});
});
