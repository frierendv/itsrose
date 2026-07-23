import { createResponse } from "../src";

describe("internal/api-response response", () => {
	describe("Success payloads", () => {
		const successProps = {
			code: "OK",
			data: { ok: true },
		} as const;

		// Extracting common assertions makes them reusable without muddying the test body
		const expectSuccessfulResponse = (response: any) => {
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
	});

	describe("Failure payloads", () => {
		const failureProps = {
			code: "INTERNAL_ERROR",
			message: "failed",
			errors: { reason: "fail" },
		} as const;

		const expectFailureResponse = (response: any) => {
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
	});
});
