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
		expect(SUCCESS.NO_CONTENT.http_code).toBe(204);
		expect(SUCCESS.RESET_CONTENT.http_code).toBe(205);
		expect(SUCCESS.PARTIAL_CONTENT.http_code).toBe(206);
		expect(SUCCESS.MULTI_STATUS.http_code).toBe(207);
	});

	it("has unique numeric codes for all SUCCESS entries", () => {
		const codes = Object.values(SUCCESS).map((item) => item.code);
		const uniqueCodes = new Set(codes);
		expect(uniqueCodes.size).toBe(codes.length);
	});

	it("exports CLIENT_ERROR definitions", () => {
		expect(CLIENT_ERROR).toBeDefined();
		expect(CLIENT_ERROR.VALIDATION_ERROR.code).toBe(2001);
		expect(CLIENT_ERROR.VALIDATION_ERROR.http_code).toBe(400);
		expect(CLIENT_ERROR.UNAUTHORIZED.http_code).toBe(401);
		expect(CLIENT_ERROR.BAD_REQUEST.http_code).toBe(400);
		expect(CLIENT_ERROR.TOKEN_MISSING.http_code).toBe(401);
		expect(CLIENT_ERROR.ACCESS_DENIED.http_code).toBe(403);
		expect(CLIENT_ERROR.ROUTE_NOT_FOUND.http_code).toBe(404);
		expect(CLIENT_ERROR.METHOD_NOT_ALLOWED.http_code).toBe(405);
		expect(CLIENT_ERROR.NOT_ACCEPTABLE.http_code).toBe(406);
		expect(CLIENT_ERROR.REQUEST_TIMEOUT.http_code).toBe(408);
		expect(CLIENT_ERROR.GONE.http_code).toBe(410);
		expect(CLIENT_ERROR.PAYLOAD_TOO_LARGE.http_code).toBe(413);
		expect(CLIENT_ERROR.UNSUPPORTED_MEDIA_TYPE.http_code).toBe(415);
	});

	it("has unique numeric error codes for all CLIENT_ERROR entries", () => {
		const codes = Object.values(CLIENT_ERROR).map((item) => item.code);
		const uniqueCodes = new Set(codes);
		expect(uniqueCodes.size).toBe(codes.length);
	});

	it("exports SERVER_ERROR definitions", () => {
		expect(SERVER_ERROR).toBeDefined();
		expect(SERVER_ERROR.INTERNAL_ERROR.code).toBe(3000);
		expect(SERVER_ERROR.INTERNAL_ERROR.http_code).toBe(500);
		expect(SERVER_ERROR.NOT_IMPLEMENTED.http_code).toBe(501);
		expect(SERVER_ERROR.BAD_GATEWAY.http_code).toBe(502);
		expect(SERVER_ERROR.GATEWAY_TIMEOUT.http_code).toBe(504);
		expect(SERVER_ERROR.HTTP_VERSION_NOT_SUPPORTED.http_code).toBe(505);
		expect(SERVER_ERROR.INSUFFICIENT_STORAGE.http_code).toBe(507);
		expect(SERVER_ERROR.LOOP_DETECTED.http_code).toBe(508);
	});

	it("has unique numeric error codes for all SERVER_ERROR entries", () => {
		const codes = Object.values(SERVER_ERROR).map((item) => item.code);
		const uniqueCodes = new Set(codes);
		expect(uniqueCodes.size).toBe(codes.length);
	});

	it("exports BUSINESS_ERROR definitions", () => {
		expect(BUSINESS_ERROR).toBeDefined();
		expect(BUSINESS_ERROR.RULE_VIOLATION.code).toBe(4000);
		expect(BUSINESS_ERROR.RULE_VIOLATION.http_code).toBe(422);
		expect(BUSINESS_ERROR.UNPROCESSABLE_ENTITY.http_code).toBe(422);
		expect(BUSINESS_ERROR.PAYMENT_REQUIRED.http_code).toBe(402);
		expect(BUSINESS_ERROR.RESOURCE_LOCKED.http_code).toBe(423);
		expect(BUSINESS_ERROR.FAILED_DEPENDENCY.http_code).toBe(424);
	});

	it("has unique numeric error codes for all BUSINESS_ERROR entries", () => {
		const codes = Object.values(BUSINESS_ERROR).map((item) => item.code);
		const uniqueCodes = new Set(codes);
		expect(uniqueCodes.size).toBe(codes.length);
	});

	it("aggregates all error codes into ERROR_CODE map with unique numeric codes", () => {
		expect(ERROR_CODE).toBeDefined();
		expect(ERROR_CODE.VALIDATION_ERROR).toEqual(
			CLIENT_ERROR.VALIDATION_ERROR
		);
		expect(ERROR_CODE.INTERNAL_ERROR).toEqual(SERVER_ERROR.INTERNAL_ERROR);
		expect(ERROR_CODE.RULE_VIOLATION).toEqual(
			BUSINESS_ERROR.RULE_VIOLATION
		);
		expect(ERROR_CODE.UNKNOWN).toBeDefined();

		const codes = Object.values(ERROR_CODE).map((item) => item.code);
		const uniqueCodes = new Set(codes);
		expect(uniqueCodes.size).toBe(codes.length);
	});
});
