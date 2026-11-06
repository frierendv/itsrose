import { resolveStorageConfig } from "../src/config";

describe("resolveStorageConfig", () => {
	it("prefers explicit overrides over the environment", () => {
		expect(
			resolveStorageConfig({
				accountId: "account",
				accessKeyId: "access",
				secretAccessKey: "secret",
				bucket: "bucket",
				publicDomain: "https://cdn.example",
			})
		).toEqual({
			accountId: "account",
			accessKeyId: "access",
			secretAccessKey: "secret",
			bucket: "bucket",
			publicDomain: "https://cdn.example",
		});
	});
});
