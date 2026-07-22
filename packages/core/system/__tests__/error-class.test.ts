import {
	InvalidRequestError,
	SystemError,
	ThirdPartyApiError,
} from "../src/error-class";

describe("Error class", () => {
	describe("SystemError", () => {
		it("should create an instance with a message", () => {
			const error = new SystemError("System error occurred");
			expect(error).toBeInstanceOf(SystemError);
			expect(error.name).toBe("SystemError");
			expect(error.message).toBe("System error occurred");
		});
	});

	describe("InvalidRequestError", () => {
		it("should create an instance with a message", () => {
			const error = new InvalidRequestError("message");
			expect(error).toBeInstanceOf(InvalidRequestError);
			expect(error.name).toBe("InvalidRequestError");
			expect(error.message).toBe("message");
		});
	});

	describe("ThirdPartyApiError", () => {
		it("should create an instance with a message and code", () => {
			const error = new ThirdPartyApiError("message", 404);
			expect(error).toBeInstanceOf(ThirdPartyApiError);
			expect(error.name).toBe("ThirdPartyApiError");
			expect(error.message).toBe("message");
			expect(error.statusCode).toBe(404);
		});
	});
});
