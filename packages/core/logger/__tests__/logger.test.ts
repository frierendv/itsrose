import pino from "pino";
import { createPino, logLevels, pinoTransport } from "../src";
import { isErrorLike, serializeError } from "../src/pino-transport/errors";
import { prettyFormatPino } from "../src/pino-transport/format";

describe("core/logger", () => {
	describe("logLevels", () => {
		it("defines default log levels", () => {
			expect(logLevels).toBeDefined();
			expect(logLevels.info).toBe(30);
			expect(logLevels.error).toBe(50);
		});
	});

	describe("pinoTransport", () => {
		it("creates a transform stream with pino options", () => {
			const transport = pinoTransport({
				customLevels: logLevels,
				appName: "TestApp",
			});
			expect(transport).toBeDefined();
			expect(typeof transport.write).toBe("function");
		});
	});

	describe("createPino", () => {
		it("instantiates a pino logger instance with custom configuration", () => {
			const logger = createPino(pino, {
				appName: "TestApp",
			});
			expect(logger).toBeDefined();
			expect(typeof logger.info).toBe("function");
		});
	});

	describe("prettyFormatPino & error formatters", () => {
		it("detects error-like objects", () => {
			expect(isErrorLike(new Error("test error"))).toBe(true);
			expect(
				isErrorLike({
					name: "CustomError",
					message: "fail",
					stack: "Error: fail\n    at ...",
				})
			).toBe(true);
			expect(isErrorLike("string error")).toBe(false);
			expect(isErrorLike(null)).toBe(false);
		});

		it("serializes error objects into JSON-friendly structure", () => {
			const err = new Error("something went wrong");
			const serialized = serializeError(err) as Record<string, unknown>;
			expect(serialized.name).toBe("Error");
			expect(serialized.message).toBe("something went wrong");
			expect(serialized.stack).toBeDefined();
		});

		it("formats pino log output into a pretty string", () => {
			const result = prettyFormatPino(
				{
					level: 30,
					pid: 1234,
					hostname: "localhost",
					time: Date.now(),
					msg: "Hello World",
					appName: "MyApp",
					customLevels: logLevels,
				},
				{
					levels: { 30: "info" },
					colors: { info: "#0000ff" },
					defaultColor: "#ffffff",
				}
			);
			expect(result).toContain("Hello World");
			expect(result).toContain("[MyApp]");
		});
	});
});
