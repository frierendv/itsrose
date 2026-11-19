import { assetQueryKeys } from "../query-keys";
import { formatAssetDate, formatAssetKind, formatBytes } from "../utils";

describe("formatBytes", () => {
	it("renders whole bytes without a unit fraction", () => {
		expect(formatBytes(0)).toBe("0 B");
		expect(formatBytes(512)).toBe("512 B");
	});

	it("uses binary units", () => {
		expect(formatBytes(1024)).toBe("1 KB");
		expect(formatBytes(1536)).toBe("1.5 KB");
		expect(formatBytes(1024 * 1024)).toBe("1 MB");
		expect(formatBytes(5 * 1024 ** 3)).toBe("5 GB");
	});

	it("honours the requested fraction digits", () => {
		expect(formatBytes(1536, 2)).toBe("1.5 KB");
		expect(formatBytes(1_258_291, 2)).toBe("1.2 MB");
	});

	it("renders an em dash for unusable input", () => {
		expect(formatBytes(-1)).toBe("—");
		expect(formatBytes(Number.NaN)).toBe("—");
		expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("—");
	});
});

describe("formatAssetDate", () => {
	it("formats ISO timestamps in UTC", () => {
		expect(formatAssetDate("2026-11-05T00:00:00.000Z")).toBe("5 Nov 2026");
		expect(formatAssetDate("2026-11-19T23:30:00.000Z")).toBe("19 Nov 2026");
	});

	it("formats Date instances", () => {
		expect(formatAssetDate(new Date("2026-01-02T00:00:00.000Z"))).toBe(
			"2 Jan 2026"
		);
	});

	it("renders an em dash for missing or invalid values", () => {
		expect(formatAssetDate(null)).toBe("—");
		expect(formatAssetDate(undefined)).toBe("—");
		expect(formatAssetDate("not a date")).toBe("—");
	});
});

describe("formatAssetKind", () => {
	it("labels the uploaded kinds", () => {
		expect(formatAssetKind("voice_sample")).toBe("Voice sample");
		expect(formatAssetKind("image")).toBe("Image");
		expect(formatAssetKind("audio")).toBe("Audio");
		expect(formatAssetKind("video")).toBe("Video");
	});

	it("degrades an unknown kind instead of hiding it", () => {
		expect(formatAssetKind("scratch_note")).toBe("scratch note");
	});
});

describe("assetQueryKeys", () => {
	it("nests every list key under the invalidation prefix", () => {
		const key = assetQueryKeys.list({ limit: 24, offset: 48 });

		expect(key).toEqual(["assets", "list", 24, 48]);
		expect(key.slice(0, assetQueryKeys.all.length)).toEqual([
			...assetQueryKeys.all,
		]);
		expect(assetQueryKeys.lists()).toEqual(["assets", "list"]);
	});

	it("distinguishes pagination offsets", () => {
		expect(assetQueryKeys.list({ limit: 24, offset: 0 })).not.toEqual(
			assetQueryKeys.list({ limit: 24, offset: 24 })
		);
	});
});
