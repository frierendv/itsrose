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
		let stdoutSpy: any;

		beforeEach(() => {
			// Intercept stdout.write and stop it from printing to the console
			stdoutSpy = jest
				.spyOn(process.stdout, "write")
				.mockImplementation(() => true);
		});

		it("creates a transform stream with pino options and processes chunks", (done) => {
			const transport = pinoTransport({
				customLevels: logLevels,
				appName: "TestApp",
			});
			expect(transport).toBeDefined();

			const mockLog = {
				level: 30,
				pid: 1234,
				hostname: "localhost",
				time: Date.now(),
				msg: "Stream test message",
			};

			transport.on("data", (data) => {
				const str = data.toString();
				expect(str).toContain("Stream test message");
				expect(str).toContain("TestApp");
				done();
			});

			transport.write(JSON.stringify(mockLog) + "\n");
			expect(stdoutSpy).toHaveBeenCalled();
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

		it("serializes error objects into JSON-friendly structure including custom properties", () => {
			const err = new Error("something went wrong");
			(err as any).code = "ERR_CUSTOM";
			(err as any).status = 500;
			const serialized = serializeError(err) as Record<string, unknown>;
			expect(serialized.name).toBe("Error");
			expect(serialized.message).toBe("something went wrong");
			expect(serialized.code).toBe("ERR_CUSTOM");
			expect(serialized.status).toBe(500);

			// Fallback for non-error input
			expect(serializeError("plain string")).toBe("plain string");
		});

		it("formats pino log output into a pretty string with metadata and errors", () => {
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

			// Test circular metadata, error string/number payloads, unserializable objects, unknown level fallback, and missing time/appName
			const circularObj: any = { a: 1 };
			circularObj.self = circularObj;

			const result2 = prettyFormatPino(
				{
					level: 999, // unknown level
					pid: 1234,
					hostname: "localhost",
					time: 0,
					err: new Error("err msg"),
					metaKey: circularObj,
					metaErr: new Error("inner err"),
					customLevels: logLevels,
				},
				{
					levels: {},
					colors: {},
					defaultColor: "#ffffff",
				}
			);
			expect(result2).toContain("INFO");
			expect(result2).toContain("err msg");
			expect(result2).toContain("[Circular]");

			// String error and numeric error payloads
			const resStringErr = prettyFormatPino(
				{
					level: 30,
					pid: 1,
					hostname: "h",
					time: 1,
					err: "string error message",
				},
				{ levels: { 30: "info" }, colors: {}, defaultColor: "#fff" }
			);
			expect(resStringErr).toContain("string error message");

			const resNumErr = prettyFormatPino(
				{ level: 30, pid: 1, hostname: "h", time: 1, err: 12345 },
				{ levels: { 30: "info" }, colors: {}, defaultColor: "#fff" }
			);
			expect(resNumErr).toContain("12345");

			// Unserializable object (e.g. BigInt)
			const resUnserializable = prettyFormatPino(
				{
					level: 30,
					pid: 1,
					hostname: "h",
					time: 1,
					meta: { big: 12n },
				},
				{ levels: { 30: "info" }, colors: {}, defaultColor: "#fff" }
			);
			expect(resUnserializable).toContain("[Unserializable]");
		});
	});
});
