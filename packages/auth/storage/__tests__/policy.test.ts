import { StorageValidationError } from "@itsrose/s3";
import { ASSET_ROOT, EPHEMERAL_ROOT } from "../src/keys";
import {
	ASSET_KINDS,
	ASSET_POLICIES,
	assetPolicyFor,
	isAssetKind,
} from "../src/policy";

describe("packages/auth/storage/policy", () => {
	it("keeps the asset kind list closed", () => {
		expect(ASSET_KINDS).toEqual([
			"voice_sample",
			"image",
			"audio",
			"video",
		]);
		expect(new Set(ASSET_KINDS).size).toBe(ASSET_KINDS.length);
	});

	it("answers root, URL mode, lifetime and counted for every class", () => {
		expect(ASSET_POLICIES).toEqual({
			durable: {
				root: ASSET_ROOT,
				urlMode: "signed",
				urlTtlSeconds: 900,
				lifetimeSeconds: null,
				counted: true,
			},
			scratch: {
				root: EPHEMERAL_ROOT,
				urlMode: "signed",
				urlTtlSeconds: 900,
				lifetimeSeconds: 86_400,
				counted: false,
			},
			generated: {
				root: EPHEMERAL_ROOT,
				urlMode: "public",
				urlTtlSeconds: null,
				lifetimeSeconds: 86_400,
				counted: false,
			},
		});
	});

	it("resolves the durable policy for every asset kind", () => {
		for (const kind of ASSET_KINDS) {
			expect(assetPolicyFor(kind)).toEqual(ASSET_POLICIES.durable);
		}
	});

	it("rejects an unknown kind explicitly instead of defaulting", () => {
		expect(isAssetKind("recording")).toBe(false);
		expect(isAssetKind("")).toBe(false);
		expect(() => assetPolicyFor("recording")).toThrow(
			StorageValidationError
		);
		expect(() => assetPolicyFor("recording")).toThrow(
			/Unknown asset kind "recording"/
		);
	});
});
