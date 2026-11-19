import {
	AssetApiError,
	assetListSchema,
	assetSchema,
	parseAssetData,
	parseAssetEnvelope,
} from "../types";

const ASSET = {
	asset_id: "ast_01",
	kind: "voice_sample",
	filename: "sample.wav",
	size_bytes: 2048,
	content_type: "audio/wav",
	created_at: "2026-11-19T08:00:00.000Z",
};

function successEnvelope(data: unknown) {
	return {
		ok: true,
		code: 1000,
		message: "OK",
		data,
		errors: null,
		meta: {},
	};
}

function failureEnvelope() {
	return {
		ok: false,
		code: 4001,
		message: "An asset upload needs both a `kind` field and a `file` part.",
		data: null,
		errors: {
			upload: "Send a multipart form with `kind` and `file`.",
		},
		meta: {},
	};
}

describe("asset envelope parsing", () => {
	it("parses a success envelope and its snake_case payload", () => {
		const envelope = parseAssetEnvelope(
			successEnvelope({
				items: [ASSET],
				limit: 24,
				offset: 0,
			})
		);

		expect(envelope.ok).toBe(true);
		if (!envelope.ok) {
			throw new Error("expected a success envelope");
		}

		const page = parseAssetData(assetListSchema, envelope.data);
		const item = page.items.at(0);
		expect(page.items).toHaveLength(1);
		expect(item).toEqual(ASSET);
		if (!item) {
			throw new Error("expected one asset");
		}
		expect(Object.keys(item).sort()).toEqual([
			"asset_id",
			"content_type",
			"created_at",
			"filename",
			"kind",
			"size_bytes",
		]);
	});

	it("keeps a failure envelope as data rather than an exception", () => {
		const envelope = parseAssetEnvelope(failureEnvelope(), 400);

		expect(envelope.ok).toBe(false);
		if (envelope.ok) {
			throw new Error("expected a failure envelope");
		}

		expect(envelope.code).toBe(4001);
		expect(envelope.errors).toEqual({
			upload: "Send a multipart form with `kind` and `file`.",
		});
	});

	it("parses a failure envelope whose errors field is absent", () => {
		const envelope = parseAssetEnvelope({
			...failureEnvelope(),
			errors: null,
		});

		expect(envelope.ok).toBe(false);
	});

	it("rejects a body that is not an envelope", () => {
		expect(() =>
			parseAssetEnvelope("<html>502 Bad Gateway</html>", 502)
		).toThrow(AssetApiError);
		expect(() => parseAssetEnvelope(null, 502)).toThrow(
			/unexpected response/
		);
	});

	it("rejects a success payload that breaks the schema", () => {
		expect(() =>
			parseAssetData(assetSchema, { ...ASSET, size_bytes: -1 })
		).toThrow(AssetApiError);
		expect(() =>
			parseAssetData(assetSchema, { ...ASSET, filename: undefined })
		).toThrow(AssetApiError);
	});

	it("carries the envelope diagnostics on the error", () => {
		const error = new AssetApiError("nope", {
			status: 400,
			code: 4001,
			errors: { upload: "missing" },
		});

		expect(error.name).toBe("AssetApiError");
		expect(error.message).toBe("nope");
		expect(error.status).toBe(400);
		expect(error.code).toBe(4001);
		expect(error.errors).toEqual({ upload: "missing" });
	});
});
