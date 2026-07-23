import {
	BUSINESS_ERROR,
	CLIENT_ERROR,
	ERROR_CODE,
	SERVER_ERROR,
	SUCCESS,
	SUCCESS_CODE,
} from "../src";

describe("internal/http-code", () => {
	it("exports SUCCESS and SUCCESS_CODE definitions", () => {
		expect(SUCCESS).toBeDefined();
		expect(SUCCESS_CODE).toBe(SUCCESS);
		expect(SUCCESS.OK.code).toBe(1000);
		expect(SUCCESS.OK.http_code).toBe(200);
	});

	it("exports CLIENT_ERROR definitions", () => {
		expect(CLIENT_ERROR).toBeDefined();
		expect(CLIENT_ERROR.VALIDATION_ERROR.code).toBe(2001);
		expect(CLIENT_ERROR.VALIDATION_ERROR.http_code).toBe(400);
		expect(CLIENT_ERROR.UNAUTHORIZED.http_code).toBe(401);
	});

	it("exports SERVER_ERROR definitions", () => {
		expect(SERVER_ERROR).toBeDefined();
		expect(SERVER_ERROR.INTERNAL_ERROR.code).toBe(3000);
		expect(SERVER_ERROR.INTERNAL_ERROR.http_code).toBe(500);
	});

	it("exports BUSINESS_ERROR definitions", () => {
		expect(BUSINESS_ERROR).toBeDefined();
		expect(BUSINESS_ERROR.RULE_VIOLATION.code).toBe(4000);
		expect(BUSINESS_ERROR.RULE_VIOLATION.http_code).toBe(422);
	});

	it("aggregates all error codes into ERROR_CODE map", () => {
		expect(ERROR_CODE).toBeDefined();
		expect(ERROR_CODE.VALIDATION_ERROR).toEqual(
			CLIENT_ERROR.VALIDATION_ERROR
		);
		expect(ERROR_CODE.INTERNAL_ERROR).toEqual(SERVER_ERROR.INTERNAL_ERROR);
		expect(ERROR_CODE.RULE_VIOLATION).toEqual(
			BUSINESS_ERROR.RULE_VIOLATION
		);
		expect(ERROR_CODE.UNKNOWN).toBeDefined();
	});
});
