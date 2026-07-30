import * as systemModule from "@itsrose/system";
import { Client } from "../src/client/client";

jest.mock("@itsrose/system", () => {
	const actual = jest.requireActual("@itsrose/system");
	return {
		...actual,
		getEnv: jest.fn(),
	};
});

describe("Client", () => {
	const mockGetEnv = systemModule.getEnv as jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should initialize correctly when environment variables are set", () => {
		mockGetEnv.mockImplementation((key: string) => {
			if (key === "CAI_USER_TOKEN") {
				return "test-user-token-123";
			}
			if (key === "CAI_NEO_BASE_URL") {
				return "https://example.com";
			}
			return "";
		});

		const client = new Client();

		expect(client.neoBaseUrl).toBe("https://example.com");
		expect(client.neoWssUrl).toBe("https://example.com/ws/");
		expect(client.getHeaders()).toEqual({
			Cookie: 'HTTP_AUTHORIZATION="Token test-user-token-123";',
		});
		expect(client.user).toBeDefined();
		expect(client.character).toBeDefined();
		expect(client.chat).toBeDefined();
		expect(client.http).toBeDefined();
	});

	it("should throw error if required env variable is missing", () => {
		mockGetEnv.mockImplementation((key: string) => {
			if (key === "CAI_USER_TOKEN") {
				throw new systemModule.SystemError(
					"Environment variable CAI_USER_TOKEN is required"
				);
			}
			return "";
		});

		expect(() => new Client()).toThrow(systemModule.SystemError);
	});
});
