/* eslint-disable turbo/no-undeclared-env-vars */
import { getEnv } from "../src/environment";
import { SystemError } from "../src/error-class";

describe("getEnv", () => {
	const ENV = process.env;

	beforeEach(() => {
		process.env = { ...ENV };
	});

	afterEach(() => {
		process.env = ENV;
	});

	describe("Basic resolution", () => {
		it("returns the value of an existing environment variable", () => {
			process.env.TEST_KEY = "test-value";
			expect(getEnv("TEST_KEY")).toBe("test-value");
		});

		it("returns undefined if the variable is not set and not required", () => {
			delete process.env.TEST_KEY;
			expect(getEnv("TEST_KEY")).toBeUndefined();
		});

		it("returns undefined if the variable is an empty string (without allowEmpty)", () => {
			process.env.TEST_KEY = "";
			expect(getEnv("TEST_KEY")).toBeUndefined();
		});
	});

	describe("Requirement validation (isRequired)", () => {
		it("throws SystemError if the variable is not set and is required", () => {
			delete process.env.TEST_KEY;
			expect(() => getEnv("TEST_KEY", { isRequired: true })).toThrow(
				SystemError
			);
		});

		it("throws SystemError if the variable is an empty string and is required", () => {
			process.env.TEST_KEY = "";
			expect(() => getEnv("TEST_KEY", { isRequired: true })).toThrow(
				SystemError
			);
		});

		it("throws a custom error message if provided as a string", () => {
			delete process.env.TEST_KEY;
			expect(() =>
				getEnv("TEST_KEY", {
					isRequired: true,
					message: "Custom crash!",
				})
			).toThrow("Custom crash!");
		});

		it("throws a custom error message if provided as a factory function", () => {
			delete process.env.TEST_KEY;
			expect(() =>
				getEnv("TEST_KEY", {
					isRequired: true,
					message: (key) => `Key ${key} is missing`,
				})
			).toThrow("Key TEST_KEY is missing");
		});
	});

	describe("Empty string overrides (allowEmpty)", () => {
		it("returns an empty string if allowEmpty is true", () => {
			process.env.TEST_KEY = "";
			expect(getEnv("TEST_KEY", { allowEmpty: true })).toBe("");
		});
	});

	describe("Default value fallbacks", () => {
		it("returns the default value if the variable is not set", () => {
			delete process.env.TEST_KEY;
			expect(getEnv("TEST_KEY", { defaultValue: "fallback" })).toBe(
				"fallback"
			);
		});

		it("returns the default value if the variable is an empty string", () => {
			process.env.TEST_KEY = "";
			expect(getEnv("TEST_KEY", { defaultValue: "fallback" })).toBe(
				"fallback"
			);
		});

		it("returns the empty string instead of the default value if allowEmpty is true", () => {
			process.env.TEST_KEY = "";
			expect(
				getEnv("TEST_KEY", {
					defaultValue: "fallback",
					allowEmpty: true,
				})
			).toBe("");
		});
	});

	describe("Preprocessing", () => {
		it("transforms the resolved value before returning it", () => {
			process.env.TEST_PORT = "8080";
			const port = getEnv("TEST_PORT", { preprocess: Number });

			expect(port).toBe(8080);
			expect(typeof port).toBe("number");
		});

		it("transforms the default value if the variable is missing", () => {
			delete process.env.TEST_PORT;
			const port = getEnv("TEST_PORT", {
				defaultValue: "3000",
				preprocess: Number,
			});

			expect(port).toBe(3000);
		});
	});
});
