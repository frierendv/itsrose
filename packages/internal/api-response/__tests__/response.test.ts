import {
	createResponse,
	extractMeta,
	FailureResponse,
	mergeMeta,
	SuccessResponse,
} from "../src";

type SuccessProps = Parameters<typeof SuccessResponse.create>[0];
type FailureProps = Parameters<typeof FailureResponse.create>[0];
type SuccessCodeKey = NonNullable<SuccessProps["code"]>;
type FailureCodeKey = NonNullable<FailureProps["code"]>;

/**
 * Minimal structural shape of a standardized API response envelope.
 * The production factories return the interface types, while the runtime
 * values are class instances exposing `toJSON()`.
 */
type ResponseEnvelope = {
	ok: boolean;
	data: unknown;
	errors: unknown;
};

type FailureResponseEnvelope = ResponseEnvelope & {
	toJSON: () => unknown;
};

const isResponseEnvelope = (value: unknown): value is ResponseEnvelope =>
	typeof value === "object" &&
	value !== null &&
	"ok" in value &&
	"data" in value &&
	"errors" in value;

const isFailureResponseEnvelope = (
	value: unknown
): value is FailureResponseEnvelope =>
	isResponseEnvelope(value) &&
	"toJSON" in value &&
	typeof value.toJSON === "function";

describe("internal/api-response response", () => {
	describe("Success payloads", () => {
		const successProps = {
			code: "OK",
			data: { ok: true },
		} as const;

		// Extracting common assertions makes them reusable without muddying the test body
		const expectSuccessfulResponse = (response: unknown) => {
			if (!isResponseEnvelope(response)) {
				throw new Error(
					"expected a standardized API response envelope"
				);
			}

			expect(response.ok).toBe(true);
			expect(response.errors).toBeNull();
			expect(response.data).toEqual(successProps.data);
		};

		it("instantiates using the generic createResponse()", () => {
			const response = createResponse(successProps);
			expectSuccessfulResponse(response);
		});

		it("instantiates using createResponse.success()", () => {
			const response = createResponse.success(successProps);
			expectSuccessfulResponse(response);
		});

		it("extracts and merges 'meta' from data into the root payload", () => {
			const successWithMetaProps = {
				...successProps,
				data: { ...successProps.data, meta: { number: 1 } },
				meta: { string: "2" },
			};

			const response = createResponse(successWithMetaProps);

			// Use toHaveProperty to avoid `as any` casting
			expect(response.data).not.toHaveProperty("meta");
			expect(response.meta).toBeDefined();
			expect(response.meta).toEqual({
				number: 1,
				string: "2",
			});
		});

		it("handles unknown success code fallback", () => {
			// Invariant: the code is intentionally outside the SUCCESS_CODE map so
			// the factory has to fall back to the default "OK" response.
			const unknownSuccessCode =
				"UNKNOWN_SUCCESS_CODE" as unknown as SuccessCodeKey;

			const res = SuccessResponse.create({
				code: unknownSuccessCode,
				data: {},
			});
			expect(res.ok).toBe(true);
			expect(res.statusCode).toBe(200);
		});
	});

	describe("Failure payloads", () => {
		const failureProps = {
			code: "INTERNAL_ERROR",
			message: "failed",
			errors: { reason: "fail" },
		} as const;

		const expectFailureResponse = (response: unknown) => {
			if (!isFailureResponseEnvelope(response)) {
				throw new Error("expected a standardized failure API response");
			}

			expect(response.ok).toBe(false);
			expect(response.data).toBeNull();
			expect(response.errors).not.toBeNull();
			expect(response.toJSON()).toBeInstanceOf(Object);
		};

		it("instantiates using the generic createResponse()", () => {
			const response = createResponse(failureProps);
			expectFailureResponse(response);
		});

		it("instantiates using createResponse.failure()", () => {
			const response = createResponse.failure(failureProps);
			expectFailureResponse(response);
		});

		it("extracts and merges 'meta' from errors into the root payload", () => {
			const failureWithMetaProps = {
				...failureProps,
				errors: { ...failureProps.errors, meta: { number: 1 } },
				meta: { string: "2" },
			};

			const response = createResponse(failureWithMetaProps);

			expect(response.errors).not.toHaveProperty("meta");
			expect(response.meta).toBeDefined();
			expect(response.meta).toEqual({
				number: 1,
				string: "2",
			});
		});

		it("handles unknown error code and fallback message", () => {
			// Invariant: the code is intentionally outside the ERROR_CODE map so
			// the factory has to fall back to the default "UNKNOWN" response.
			const unknownErrorCode =
				"NON_EXISTENT_CODE" as unknown as FailureCodeKey;

			const customFailure = FailureResponse.create({
				code: unknownErrorCode,
				errors: {},
			});
			expect(customFailure.ok).toBe(false);
			expect(customFailure.statusCode).toBe(500);
			expect(customFailure.message).toBeDefined();
		});
	});

	describe("createResponse payload shape inference without code", () => {
		it("infers failure response when 'errors' is in props", () => {
			const res = createResponse({ errors: { detail: "error" } });
			expect(res.ok).toBe(false);
		});

		it("infers success response when 'errors' is absent and no code provided", () => {
			const res = createResponse({ data: { hello: "world" } });
			expect(res.ok).toBe(true);
		});
	});

	// this is useless test
	describe("Re-exports in index.ts", () => {
		it("exports extractMeta and mergeMeta helpers", () => {
			expect(typeof extractMeta).toBe("function");
			expect(typeof mergeMeta).toBe("function");
		});
	});
});
