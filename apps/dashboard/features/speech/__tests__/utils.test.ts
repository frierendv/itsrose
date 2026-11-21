import { ApiError } from "@/lib/api/envelope";
import {
	generationExcerpt,
	generationFilename,
	isExpiredGenerationError,
} from "../utils";

afterEach(() => {
	vi.useRealTimers();
});

describe("generationExcerpt", () => {
	it("labels a generation with no input", () => {
		expect(generationExcerpt(null)).toBe("Untitled generation");
		expect(generationExcerpt("   \n  ")).toBe("Untitled generation");
	});

	it("collapses whitespace into one line", () => {
		expect(generationExcerpt("Hello\n\n  there\tfriend.")).toBe(
			"Hello there friend."
		);
	});

	it("keeps a short script whole", () => {
		expect(generationExcerpt("A short line.")).toBe("A short line.");
	});

	it("cuts a long script at a word boundary with an ellipsis", () => {
		const excerpt = generationExcerpt(`${"word ".repeat(40)}end`);

		expect(excerpt.endsWith("…")).toBe(true);
		expect(excerpt.length).toBeLessThanOrEqual(96);
		expect(excerpt).not.toContain("wor…");
	});
});

describe("generationFilename", () => {
	it("names the file after the generation's UTC day", () => {
		expect(generationFilename("2026-11-20T23:59:00.000Z")).toBe(
			"tts-2026-11-20"
		);
	});

	it("falls back to today for an unreadable timestamp", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-11-21T10:00:00.000Z"));

		expect(generationFilename("not-a-date")).toBe("tts-2026-11-21");
	});
});

describe("isExpiredGenerationError", () => {
	it("recognises the URL route's 410", () => {
		expect(
			isExpiredGenerationError(
				new ApiError("The generation has expired.", { status: 410 })
			)
		).toBe(true);
	});

	it("leaves other failures alone", () => {
		expect(
			isExpiredGenerationError(
				new ApiError("Not found.", { status: 404 })
			)
		).toBe(false);
		expect(isExpiredGenerationError(new Error("boom"))).toBe(false);
	});
});
