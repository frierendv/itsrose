import { SystemError } from "@itsrose/system";
import Fastify from "fastify";
import { claimRoutePrefix, joinUrl, resolvePrefix } from "../src/prefix";

describe("the route prefix", () => {
	it("falls back to the default prefix of the module", () => {
		expect(resolvePrefix(undefined, "/audio")).toBe("/audio");
	});

	it("mounts the module at the root when the prefix is empty", () => {
		expect(resolvePrefix("", "/audio")).toBe("");
		expect(resolvePrefix("/", "/audio")).toBe("");
	});

	it("adds the leading slash and drops the trailing one", () => {
		expect(resolvePrefix("audio", "/audio")).toBe("/audio");
		expect(resolvePrefix("/audio/", "/audio")).toBe("/audio");
	});

	it("collapses the separators of the prefix", () => {
		expect(resolvePrefix("//audio//v2//", "/audio")).toBe("/audio/v2");
	});

	it("trims the prefix", () => {
		expect(resolvePrefix("  /audio  ", "/audio")).toBe("/audio");
	});

	it("refuses a prefix that would change the meaning of the url", () => {
		expect(() => resolvePrefix("/au dio", "/audio")).toThrow(SystemError);
		expect(() => resolvePrefix("/audio?x=1", "/audio")).toThrow(
			SystemError
		);
		expect(() => resolvePrefix("/audio#x", "/audio")).toThrow(SystemError);
	});

	it("joins the prefix and the path of a route", () => {
		expect(joinUrl("/audio", "/text_to_speech")).toBe(
			"/audio/text_to_speech"
		);
		expect(joinUrl("", "/text_to_speech")).toBe("/text_to_speech");
		expect(joinUrl("/audio", "text_to_speech")).toBe(
			"/audio/text_to_speech"
		);
	});

	it("never joins into a double slash", () => {
		expect(joinUrl("/audio/", "/text_to_speech")).toBe(
			"/audio/text_to_speech"
		);
		expect(joinUrl("/audio//", "/text_to_speech")).toBe(
			"/audio/text_to_speech"
		);
	});
});

describe("the prefix claim", () => {
	it("lets one module claim a prefix", async () => {
		const app = Fastify();

		expect(claimRoutePrefix(app, "/audio", "audio")).toBe("/audio");
		await app.close();
	});

	it("refuses a prefix another module already claimed", async () => {
		const app = Fastify();

		claimRoutePrefix(app, "/audio", "audio");

		expect(() => claimRoutePrefix(app, "/audio", "mtxx")).toThrow(/audio/);
		await app.close();
	});

	it("keeps the claims of one application apart from another", async () => {
		const first = Fastify();
		const second = Fastify();

		claimRoutePrefix(first, "/audio", "audio");

		expect(claimRoutePrefix(second, "/audio", "audio")).toBe("/audio");
		await first.close();
		await second.close();
	});
});
