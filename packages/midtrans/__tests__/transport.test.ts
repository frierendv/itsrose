import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
	isSuccessfulResponse,
	readBusinessStatusCode,
} from "../src/client/business-status";
import { MidtransMerchant } from "../src/client/merchant";
import { createTransport } from "../src/client/transport";

const FIXTURES_DIR = join(__dirname, "..", "fixtures");

interface FixtureFile {
	_meta: {
		name: string;
		http_status: number;
	};
	body: unknown;
}

function loadFixture(name: string): FixtureFile {
	return JSON.parse(
		readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf8")
	) as FixtureFile;
}

function createHarness(fixtureName: string) {
	const fixture = loadFixture(fixtureName);
	const merchant = new MidtransMerchant({
		serverKey: "SB-Mid-server-transport-test",
		merchantId: "G000000000",
		baseUrl: "https://api.sandbox.midtrans.com",
		snapBaseUrl: "https://app.sandbox.midtrans.com",
	});
	const http = createTransport({ merchant });
	let authorization: string | undefined;

	http.axiosInstance.defaults.adapter = async (
		config: InternalAxiosRequestConfig
	): Promise<AxiosResponse> => {
		const header = config.headers.get("Authorization");
		authorization = typeof header === "string" ? header : undefined;

		return {
			data: fixture.body,
			status: fixture._meta.http_status,
			statusText: "",
			headers: { "content-type": "application/json" },
			config,
		};
	};

	return {
		http,
		merchant,
		fixture,
		getAuthorization: () => authorization,
	};
}

describe("business status helpers", () => {
	it("reads the body status before the header", () => {
		expect(
			readBusinessStatusCode(
				{ status_code: "407" },
				{ "status-code": "500" }
			)
		).toBe("407");
		expect(readBusinessStatusCode({}, { "status-code": "407" })).toBe(
			"407"
		);
		expect(readBusinessStatusCode({}, {})).toBeUndefined();
	});

	it("treats the documented success codes as success", () => {
		for (const code of ["200", "201", "202", "407"]) {
			expect(isSuccessfulResponse(code, 200)).toBe(true);
		}
		for (const code of ["400", "404", "412", "500"]) {
			expect(isSuccessfulResponse(code, 200)).toBe(false);
		}
	});

	it("falls back to the HTTP status when there is no business code", () => {
		expect(isSuccessfulResponse(undefined, 201)).toBe(true);
		expect(isSuccessfulResponse(undefined, 204)).toBe(true);
		expect(isSuccessfulResponse(undefined, 404)).toBe(false);
	});
});

describe("transport response classification", () => {
	it("treats a successful expiry (407) as success", async () => {
		const { http } = createHarness("core/expire-success");

		const result = await http.get("/v2/ORDER-REDACTED/expire");

		expect(result.ok).toBe(true);
		expect(result.error).toBeUndefined();
		expect((result.data as { status_code: string }).status_code).toBe(
			"407"
		);
	});

	it("treats a status lookup after expiry (407) as success", async () => {
		const { http } = createHarness("core/status-after-expire");

		const result = await http.get("/v2/ORDER-REDACTED/status");

		expect(result.ok).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it("maps a business 404 to a structured error", async () => {
		const { http } = createHarness("core/status-not-found");

		const result = await http.get("/v2/missing/status");

		expect(result.ok).toBe(false);
		expect(result.error).toMatchObject({
			kind: "core",
			status_code: 404,
			status_code_raw: "404",
			status_message: "Transaction doesn't exist.",
		});
	});

	it("maps a 412 lifecycle conflict to a structured error", async () => {
		const { http } = createHarness("core/cancel-error");

		const result = await http.post("/v2/ORDER-REDACTED/cancel");

		expect(result.ok).toBe(false);
		expect(result.error).toMatchObject({
			kind: "core",
			status_code: 412,
			status_code_raw: "412",
		});
	});

	it("preserves validation messages", async () => {
		const { http } = createHarness("core/error-validation");

		const result = await http.post("/v2/charge", {});

		expect(result.ok).toBe(false);
		expect(result.error).toMatchObject({
			kind: "core",
			status_code: 400,
		});
		expect(result.error?.validation_messages).toEqual(
			expect.arrayContaining(["transaction_details is required"])
		);
	});

	it("maps HTTP 401 to an unauthorized error", async () => {
		const { http } = createHarness("core/error-unauthorized");

		const result = await http.post("/v2/charge", {});

		expect(result.ok).toBe(false);
		expect(result.error).toMatchObject({
			kind: "unauthorized",
			status_code: 401,
			status_message: "Unauthorized",
		});
	});

	it("maps an empty 404 body to a transport error", async () => {
		const { http } = createHarness("core/approve-empty-response");

		const result = await http.post("/v2/ORDER-REDACTED/approve");

		expect(result.ok).toBe(false);
		expect(result.error).toMatchObject({
			kind: "transport",
			status_code: 404,
		});
		expect(typeof result.error?.status_message).toBe("string");
	});

	it("maps legacy error_messages envelopes", async () => {
		const { http } = createHarness("snap/error-validation");

		const result = await http.post("/snap/v1/transactions", {});

		expect(result.ok).toBe(false);
		expect(result.error).toMatchObject({
			kind: "legacy",
			status_code: 400,
		});
		expect(result.error?.error_messages?.length).toBeGreaterThan(0);
	});

	it("maps subscription-shaped errors", async () => {
		const { http } = createHarness("subscription/error-not-found");

		const result = await http.get("/v1/subscriptions/missing");

		expect(result.ok).toBe(false);
		expect(result.error).toMatchObject({
			kind: "core",
			status_code: 404,
			status_message: "Subscription doesn't exist.",
		});
	});

	it("keeps HTTP 201 responses successful", async () => {
		const { http } = createHarness("snap/create");

		const result = await http.post("/snap/v1/transactions", {});

		expect(result.ok).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it("attaches BASIC auth to Midtrans requests", async () => {
		const { http, merchant, getAuthorization } =
			createHarness("snap/create");

		await http.get("/snap/v3/merchant-preferences", {
			baseURL: merchant.snapBaseUrl,
		});

		expect(getAuthorization()).toBe(merchant.createAuthKey());
	});
});
