import multipart from "@fastify/multipart";
import { assetPolicyFor } from "@itsrose/auth-storage";
import {
	AssetCapExceededError,
	AssetNotFoundError,
	type AssetService,
	type ListAssetsInput,
	type ReadAssetUrlInput,
	type RemoveAssetInput,
	type UploadAssetInput,
} from "@itsrose/auth-storage/assets";
import type { AssetRecord } from "@itsrose/auth-storage/types";
import { tenantIdForUser } from "@itsrose/auth-usage/server";
import type { AuthServer } from "@itsrose/auth/server";
import Fastify, { type FastifyInstance } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import { autoConfig as multipartConfig } from "../src/plugins/external/multipart";
import apiResponsePlugin from "../src/plugins/openapi/api-response";
import assetsRoutes from "../src/routes/assets";

const USER_ID = "user-1";
const ASSET_ID = "asset-1";
const CREATED_AT = new Date("2026-11-19T04:00:00.000Z");
const FILE_BYTES = Buffer.from([0, 1, 2, 3, 254, 255]);

const RECORD: AssetRecord = {
	asset_id: ASSET_ID,
	user_id: USER_ID,
	tenant_id: "tenant-1",
	kind: "voice_sample",
	key: `assets/users/${USER_ID}/voice_sample/${ASSET_ID}/sample.wav`,
	filename: "sample.wav",
	size_bytes: FILE_BYTES.length,
	content_type: "audio/wav",
	status: "ready",
	created_at: CREATED_AT,
	deleted_at: null,
};

const EXPECTED_DTO = {
	asset_id: ASSET_ID,
	kind: "voice_sample",
	filename: "sample.wav",
	size_bytes: FILE_BYTES.length,
	content_type: "audio/wav",
	created_at: CREATED_AT.toISOString(),
};

type ServiceCalls = {
	upload: UploadAssetInput[];
	list: ListAssetsInput[];
	readUrl: ReadAssetUrlInput[];
	remove: RemoveAssetInput[];
};

type ServiceOptions = {
	uploadError?: Error;
	readUrlError?: Error;
	removeError?: Error;
};

type BuildOptions = ServiceOptions & {
	/** `null` means the caller has no session; omitted means a valid one. */
	session?: { user: { id: string } } | null;
};

type BuiltApp = {
	app: FastifyInstance;
	calls: ServiceCalls;
	sessionInputs: unknown[];
};

/**
 * Builds the asset service over the recording fake the app expects.
 *
 * Every port answer is canned; the calls are what the routes are asserted on.
 */
function createService(options: ServiceOptions = {}): {
	service: AssetService;
	calls: ServiceCalls;
} {
	const calls: ServiceCalls = {
		upload: [],
		list: [],
		readUrl: [],
		remove: [],
	};

	const service: AssetService = {
		async upload(input) {
			calls.upload.push(input);
			if (options.uploadError) {
				throw options.uploadError;
			}
			return RECORD;
		},
		async list(input) {
			calls.list.push(input);
			return [RECORD];
		},
		async readUrl(input) {
			calls.readUrl.push(input);
			if (options.readUrlError) {
				throw options.readUrlError;
			}
			return {
				url: "https://storage.test/signed?token=1",
				expires_in: 900,
			};
		},
		async remove(input) {
			calls.remove.push(input);
			if (options.removeError) {
				throw options.removeError;
			}
			return true;
		},
	};

	return { service, calls };
}

/**
 * Builds a bare app with the Zod compilers, a fake session server, the fake
 * asset service, the shared error handler and the real multipart parser.
 *
 * The multipart parser is registered with the app's own `autoConfig`, so the
 * upload test exercises the body shape the real application produces.
 */
async function buildApp(options: BuildOptions = {}): Promise<BuiltApp> {
	const { service, calls } = createService(options);
	const session =
		options.session === undefined
			? { user: { id: USER_ID } }
			: options.session;
	const sessionInputs: unknown[] = [];

	const app = Fastify();
	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(
		createSerializerCompiler({
			stringify: (value: unknown) => JSON.stringify(value),
		})
	);

	const auth = {
		api: {
			async getSession(input: unknown) {
				sessionInputs.push(input);
				return session;
			},
		},
	} as unknown as AuthServer;

	app.decorate("auth", auth);
	app.decorate("assetService", service);

	await app.register(apiResponsePlugin);
	await app.register(multipart, multipartConfig);
	await app.register(assetsRoutes);
	await app.ready();

	return { app, calls, sessionInputs };
}

const BOUNDARY = "----itsrose-asset-test-boundary";

/**
 * Builds a multipart body by hand: the upload test must not depend on a
 * client abstraction the production parser might disagree with.
 */
function multipartPayload(parts: {
	kind?: string;
	file?: {
		filename?: string;
		contentType?: string;
		bytes: Buffer;
	};
}): Buffer {
	const chunks: Buffer[] = [];
	const line = (value: string) => chunks.push(Buffer.from(`${value}\r\n`));

	if (parts.kind !== undefined) {
		line(`--${BOUNDARY}`);
		line('Content-Disposition: form-data; name="kind"');
		line("");
		line(parts.kind);
	}

	if (parts.file) {
		line(`--${BOUNDARY}`);
		line(
			`Content-Disposition: form-data; name="file"; filename="${
				parts.file.filename ?? "upload"
			}"`
		);
		line(
			`Content-Type: ${
				parts.file.contentType ?? "application/octet-stream"
			}`
		);
		line("");
		chunks.push(parts.file.bytes);
		line("");
	}

	line(`--${BOUNDARY}--`);
	line("");

	return Buffer.concat(chunks);
}

const uploadRequest = (payload: Buffer) =>
	({
		method: "POST",
		url: "/assets",
		headers: {
			"content-type": `multipart/form-data; boundary=${BOUNDARY}`,
			cookie: "better-auth.session_token=test",
		},
		payload,
	}) as const;

/**
 * Rebuilds the storage package's validation error.
 *
 * The class lives in `@itsrose/s3`, which this app does not depend on; the
 * package's own kind resolver is the honest way to produce the error the
 * service throws.
 */
function storageValidationError(): Error {
	try {
		assetPolicyFor("not-a-kind");
	} catch (error) {
		if (error instanceof Error) {
			return error;
		}
	}

	throw new Error("assetPolicyFor should reject an unknown kind.");
}

describe("GET /assets", () => {
	it("lists with the default window and the session user", async () => {
		const { app, calls, sessionInputs } = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: "/assets",
			headers: { cookie: "better-auth.session_token=test" },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			items: [EXPECTED_DTO],
			limit: 50,
			offset: 0,
		});
		expect(calls.list).toEqual([{ userId: USER_ID, limit: 50, offset: 0 }]);
		expect(sessionInputs).toHaveLength(1);
		expect(
			(sessionInputs[0] as { headers: Record<string, string> }).headers
				.cookie
		).toContain("session_token");

		await app.close();
	});

	it("passes an explicit window through without re-clamping it", async () => {
		const { app, calls } = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: "/assets?limit=10&offset=20",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ limit: 10, offset: 20 });
		expect(calls.list).toEqual([
			{ userId: USER_ID, limit: 10, offset: 20 },
		]);

		await app.close();
	});

	it("rejects a window the schema does not allow", async () => {
		const { app, calls } = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: "/assets?limit=500",
		});

		expect(response.statusCode).toBe(400);
		expect(calls.list).toEqual([]);

		await app.close();
	});
});

describe("the asset session guard", () => {
	it("answers 401 without a session, whatever API credential is sent", async () => {
		const { app, calls } = await buildApp({ session: null });

		const response = await app.inject({
			method: "GET",
			url: "/assets",
			headers: {
				authorization: "Bearer api-key",
				"x-auth-token": "true",
			},
		});

		expect(response.statusCode).toBe(401);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 2101,
			data: null,
			errors: { session: "Sign in to the dashboard and retry." },
		});
		expect(calls.list).toEqual([]);

		await app.close();
	});
});

describe("POST /assets", () => {
	it("uploads the real multipart bytes, filename and kind", async () => {
		const { app, calls } = await buildApp();

		const response = await app.inject(
			uploadRequest(
				multipartPayload({
					kind: "voice_sample",
					file: {
						filename: "sample.wav",
						contentType: "audio/wav",
						bytes: FILE_BYTES,
					},
				})
			)
		);

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(EXPECTED_DTO);
		expect(calls.upload).toHaveLength(1);

		const input = calls.upload[0];
		expect(input).toBeDefined();
		expect(input?.userId).toBe(USER_ID);
		expect(input?.tenantId).toBe(tenantIdForUser(USER_ID));
		expect(input?.kind).toBe("voice_sample");
		expect(input?.filename).toBe("sample.wav");
		expect(input?.contentType).toBe("audio/wav");
		expect(input?.body).toEqual(FILE_BYTES);

		await app.close();
	});

	it("rejects a body without a file part", async () => {
		const { app, calls } = await buildApp();

		const response = await app.inject(
			uploadRequest(multipartPayload({ kind: "voice_sample" }))
		);

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ ok: false, code: 2003 });
		expect(calls.upload).toEqual([]);

		await app.close();
	});

	it("rejects a body without a kind field", async () => {
		const { app, calls } = await buildApp();

		const response = await app.inject(
			uploadRequest(
				multipartPayload({
					file: { filename: "sample.wav", bytes: FILE_BYTES },
				})
			)
		);

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ ok: false, code: 2003 });
		expect(calls.upload).toEqual([]);

		await app.close();
	});

	it("maps an exceeded storage allowance to 403", async () => {
		const { app, calls } = await buildApp({
			uploadError: new AssetCapExceededError(
				"bytes",
				"Uploading 6 bytes would exceed the 5-byte storage allowance."
			),
		});

		const response = await app.inject(
			uploadRequest(
				multipartPayload({
					kind: "voice_sample",
					file: { bytes: FILE_BYTES },
				})
			)
		);

		expect(response.statusCode).toBe(403);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 2502,
			meta: { cap: "bytes" },
		});
		expect(calls.upload).toHaveLength(1);

		await app.close();
	});

	it("maps a storage validation error to 400", async () => {
		const { app, calls } = await buildApp({
			uploadError: storageValidationError(),
		});

		const response = await app.inject(
			uploadRequest(
				multipartPayload({
					kind: "not-a-kind",
					file: { bytes: FILE_BYTES },
				})
			)
		);

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({ ok: false, code: 2002 });
		expect(calls.upload).toHaveLength(1);

		await app.close();
	});
});

describe("GET /assets/:asset_id/url", () => {
	it("mints the signed URL for the session user", async () => {
		const { app, calls } = await buildApp();

		const response = await app.inject({
			method: "GET",
			url: `/assets/${ASSET_ID}/url`,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			url: "https://storage.test/signed?token=1",
			expires_in: 900,
		});
		expect(calls.readUrl).toEqual([{ userId: USER_ID, assetId: ASSET_ID }]);

		await app.close();
	});

	it("maps a missing asset to 404", async () => {
		const { app } = await buildApp({
			readUrlError: new AssetNotFoundError(ASSET_ID),
		});

		const response = await app.inject({
			method: "GET",
			url: `/assets/${ASSET_ID}/url`,
		});

		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({ ok: false, code: 2301 });

		await app.close();
	});
});

describe("DELETE /assets/:asset_id", () => {
	it("soft-deletes through the service and reports the result", async () => {
		const { app, calls } = await buildApp();

		const response = await app.inject({
			method: "DELETE",
			url: `/assets/${ASSET_ID}`,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ deleted: true });
		expect(calls.remove).toEqual([{ userId: USER_ID, assetId: ASSET_ID }]);

		await app.close();
	});
});
