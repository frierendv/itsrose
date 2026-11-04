import {
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { fileTypeFromBuffer } from "file-type";
import {
	detectMimeType,
	resolveKey,
	StorageClient,
	StorageClientError,
	StorageConfigError,
	StorageValidationError,
	toBuffer,
} from "../src";
import type { StorageClientConfig } from "../src";

jest.mock("file-type", () => ({
	fileTypeFromBuffer: jest.fn(),
}));

const mockedFileTypeFromBuffer = jest.mocked(fileTypeFromBuffer);

const s3Mock = mockClient(S3Client);

const baseConfig: StorageClientConfig = {
	accountId: "8f3b2c1a4d5e6f7a8b9c0d1e2f3a4b5c",
	accessKeyId: "test-access-key",
	secretAccessKey: "test-secret-key",
	bucket: "my-bucket",
};

const R2_ENDPOINT =
	"https://8f3b2c1a4d5e6f7a8b9c0d1e2f3a4b5c.r2.cloudflarestorage.com";

beforeEach(() => {
	s3Mock.reset();
	mockedFileTypeFromBuffer.mockReset();
});

describe("resolveKey", () => {
	it("joins a key prefix and key", () => {
		expect(resolveKey("app/assets", "avatar.png")).toBe(
			"app/assets/avatar.png"
		);
	});

	it("normalizes leading, trailing, and duplicate slashes", () => {
		expect(resolveKey("assets/", "img.png")).toBe("assets/img.png");
		expect(resolveKey("/assets/", "/img.png")).toBe("assets/img.png");
		expect(resolveKey("app//assets", "avatar.png")).toBe(
			"app/assets/avatar.png"
		);
	});

	it("normalizes backslashes", () => {
		expect(resolveKey("app\\assets", "avatar.png")).toBe(
			"app/assets/avatar.png"
		);
	});

	it("returns the key unchanged when no prefix is provided", () => {
		expect(resolveKey(undefined, "avatar.png")).toBe("avatar.png");
	});
});

describe("toBuffer", () => {
	it("returns a Buffer unchanged", () => {
		const buffer = Buffer.from("hello");
		expect(toBuffer(buffer)).toBe(buffer);
	});

	it("decodes a base64 string", () => {
		expect(toBuffer("aGVsbG8gd29ybGQ=")).toEqual(
			Buffer.from("hello world")
		);
	});

	it("decodes URL-safe base64", () => {
		expect(toBuffer("-_8=")).toEqual(Buffer.from([0xfb, 0xff]));
	});

	it("strips a data URL prefix", () => {
		expect(toBuffer("data:image/png;base64,aGVsbG8=")).toEqual(
			Buffer.from("hello")
		);
	});

	it("throws when data is neither a Buffer nor a string", () => {
		expect(() => toBuffer(123 as unknown as string)).toThrow(TypeError);
	});
});

describe("detectMimeType", () => {
	it("returns the detected MIME type", async () => {
		mockedFileTypeFromBuffer.mockResolvedValue({
			ext: "png",
			mime: "image/png",
		});

		await expect(detectMimeType(Buffer.from([0x89, 0x50]))).resolves.toBe(
			"image/png"
		);
	});

	it("returns the fallback when detection fails", async () => {
		mockedFileTypeFromBuffer.mockResolvedValue(undefined);

		await expect(detectMimeType(Buffer.from("abc"))).resolves.toBe(
			"application/octet-stream"
		);
	});

	it("returns the fallback for an empty buffer without inspecting magic bytes", async () => {
		await expect(detectMimeType(Buffer.alloc(0))).resolves.toBe(
			"application/octet-stream"
		);
		expect(mockedFileTypeFromBuffer).not.toHaveBeenCalled();
	});

	it("honors a custom fallback", async () => {
		mockedFileTypeFromBuffer.mockResolvedValue(undefined);

		await expect(
			detectMimeType(Buffer.from("abc"), "text/plain")
		).resolves.toBe("text/plain");
	});
});

describe("StorageClient construction", () => {
	it("StorageConfigError extends StorageClientError and names itself", () => {
		const error = new StorageConfigError("boom");

		expect(error).toBeInstanceOf(StorageClientError);
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("StorageConfigError");
	});

	it("StorageValidationError extends StorageClientError", () => {
		const error = new StorageValidationError("invalid key");

		expect(error).toBeInstanceOf(StorageClientError);
		expect(error.name).toBe("StorageValidationError");
	});

	it("builds the R2 endpoint and defaults", () => {
		const client = new StorageClient(baseConfig);

		expect(client.accountId).toBe(baseConfig.accountId);
		expect(client.bucket).toBe("my-bucket");
		expect(client.endpoint).toBe(R2_ENDPOINT);
		expect(client.keyPrefix).toBeUndefined();
		expect(client.publicDomain).toBeUndefined();
	});

	it("normalizes publicDomain with an implicit https protocol", () => {
		const client = new StorageClient({
			...baseConfig,
			publicDomain: "cdn.myapp.com/",
		});

		expect(client.publicDomain).toBe("https://cdn.myapp.com");
	});

	it("preserves an explicit http protocol", () => {
		const client = new StorageClient({
			...baseConfig,
			publicDomain: "http://localhost:9000",
		});

		expect(client.publicDomain).toBe("http://localhost:9000");
	});

	it("treats empty publicDomain as unset", () => {
		const client = new StorageClient({
			...baseConfig,
			publicDomain: "   ",
		});

		expect(client.publicDomain).toBeUndefined();
	});

	it("trims keyPrefix", () => {
		const client = new StorageClient({
			...baseConfig,
			keyPrefix: "  app/assets  ",
		});

		expect(client.keyPrefix).toBe("app/assets");
	});

	it("throws StorageConfigError when a required field is blank", () => {
		expect(
			() => new StorageClient({ ...baseConfig, accountId: "" })
		).toThrow(StorageConfigError);
		expect(
			() => new StorageClient({ ...baseConfig, accessKeyId: "   " })
		).toThrow(StorageConfigError);
		expect(
			() => new StorageClient({ ...baseConfig, secretAccessKey: "" })
		).toThrow(StorageConfigError);
		expect(
			() => new StorageClient({ ...baseConfig, bucket: "  " })
		).toThrow(StorageConfigError);
	});

	it("throws StorageConfigError when required fields are undefined", () => {
		expect(() => new StorageClient({} as StorageClientConfig)).toThrow(
			StorageConfigError
		);
	});
});

describe("StorageClient.upload", () => {
	it("uploads a Buffer and auto-detects the content type", async () => {
		mockedFileTypeFromBuffer.mockResolvedValue({
			ext: "png",
			mime: "image/png",
		});

		const client = new StorageClient(baseConfig);
		const buffer = Buffer.from("89504e47", "hex");

		const result = await client.upload("avatar.png", buffer);

		const [call] = s3Mock.commandCalls(PutObjectCommand);
		expect(call).toBeDefined();
		expect(call!.args[0].input.Bucket).toBe("my-bucket");
		expect(call!.args[0].input.Key).toBe("avatar.png");
		expect(call!.args[0].input.ContentType).toBe("image/png");
		expect(call!.args[0].input.Body).toEqual(buffer);
		expect(result).toEqual({ key: "avatar.png" });
	});

	it("uploads a base64 string", async () => {
		mockedFileTypeFromBuffer.mockResolvedValue(undefined);

		const client = new StorageClient(baseConfig);

		const result = await client.upload("hello.txt", "aGVsbG8=");

		const [call] = s3Mock.commandCalls(PutObjectCommand);
		expect(call!.args[0].input.Body).toEqual(Buffer.from("hello"));
		expect(call!.args[0].input.ContentType).toBe(
			"application/octet-stream"
		);
		expect(result).toEqual({ key: "hello.txt" });
	});

	it("respects an explicit content type and metadata", async () => {
		const client = new StorageClient(baseConfig);

		const result = await client.upload("doc.pdf", Buffer.from("pdf"), {
			contentType: "application/pdf",
			metadata: { author: "me" },
		});

		const [call] = s3Mock.commandCalls(PutObjectCommand);
		expect(call!.args[0].input.ContentType).toBe("application/pdf");
		expect(call!.args[0].input.Metadata).toEqual({ author: "me" });
		expect(mockedFileTypeFromBuffer).not.toHaveBeenCalled();
		expect(result).toEqual({ key: "doc.pdf" });
	});

	it("falls back to detection for a whitespace content type", async () => {
		mockedFileTypeFromBuffer.mockResolvedValue({
			ext: "png",
			mime: "image/png",
		});

		const client = new StorageClient(baseConfig);

		await client.upload("a.png", Buffer.from("x"), {
			contentType: "   ",
		});

		const [call] = s3Mock.commandCalls(PutObjectCommand);
		expect(call!.args[0].input.ContentType).toBe("image/png");
	});

	it("resolves the key prefix and returns a public URL", async () => {
		mockedFileTypeFromBuffer.mockResolvedValue(undefined);

		const client = new StorageClient({
			...baseConfig,
			keyPrefix: "app/assets",
			publicDomain: "cdn.myapp.com",
		});

		const result = await client.upload("avatar.png", Buffer.from("x"));

		const [call] = s3Mock.commandCalls(PutObjectCommand);
		expect(call!.args[0].input.Key).toBe("app/assets/avatar.png");
		expect(result).toEqual({
			key: "app/assets/avatar.png",
			url: "https://cdn.myapp.com/app/assets/avatar.png",
		});
	});

	it("passes cacheControl and returns the ETag", async () => {
		s3Mock.on(PutObjectCommand).resolves({ ETag: "abc123" });

		const client = new StorageClient(baseConfig);

		const result = await client.upload("doc.pdf", Buffer.from("pdf"), {
			contentType: "application/pdf",
			cacheControl: "public, max-age=3600",
		});

		const [call] = s3Mock.commandCalls(PutObjectCommand);
		expect(call!.args[0].input.CacheControl).toBe("public, max-age=3600");
		expect(result).toEqual({ key: "doc.pdf", etag: "abc123" });
	});
});

describe("StorageClient.download", () => {
	it("downloads an object as a Buffer", async () => {
		s3Mock.on(GetObjectCommand).resolves({
			Body: {
				transformToByteArray: async () =>
					new Uint8Array(Buffer.from("hello world")),
			} as unknown as NonNullable<GetObjectCommandOutput["Body"]>,
		});

		const client = new StorageClient(baseConfig);

		const result = await client.download("hello.txt");

		expect(result).toEqual(Buffer.from("hello world"));

		const [call] = s3Mock.commandCalls(GetObjectCommand);
		expect(call!.args[0].input).toEqual({
			Bucket: "my-bucket",
			Key: "hello.txt",
		});
	});

	it("returns an empty buffer when the response has no body", async () => {
		s3Mock.on(GetObjectCommand).resolves({});

		const client = new StorageClient(baseConfig);

		await expect(client.download("missing.txt")).resolves.toEqual(
			Buffer.alloc(0)
		);
	});

	it("applies the key prefix", async () => {
		s3Mock.on(GetObjectCommand).resolves({
			Body: {
				transformToByteArray: async () =>
					new Uint8Array(Buffer.from("x")),
			} as unknown as NonNullable<GetObjectCommandOutput["Body"]>,
		});

		const client = new StorageClient({
			...baseConfig,
			keyPrefix: "app/assets",
		});

		await client.download("hello.txt");

		const [call] = s3Mock.commandCalls(GetObjectCommand);
		expect(call!.args[0].input.Key).toBe("app/assets/hello.txt");
	});
});

describe("StorageClient.delete", () => {
	it("sends a DeleteObjectCommand", async () => {
		const client = new StorageClient(baseConfig);

		await client.delete("avatar.png");

		const [call] = s3Mock.commandCalls(DeleteObjectCommand);
		expect(call).toBeDefined();
		expect(call!.args[0].input).toEqual({
			Bucket: "my-bucket",
			Key: "avatar.png",
		});
	});

	it("applies the key prefix", async () => {
		const client = new StorageClient({
			...baseConfig,
			keyPrefix: "app/assets",
		});

		await client.delete("avatar.png");

		const [call] = s3Mock.commandCalls(DeleteObjectCommand);
		expect(call!.args[0].input.Key).toBe("app/assets/avatar.png");
	});
});

describe("StorageClient.getPublicUrl", () => {
	it("returns null when no publicDomain is configured", () => {
		const client = new StorageClient(baseConfig);

		expect(client.getPublicUrl("avatar.png")).toBeNull();
	});

	it("builds a URL from the public domain", () => {
		const client = new StorageClient({
			...baseConfig,
			publicDomain: "cdn.myapp.com",
		});

		expect(client.getPublicUrl("avatar.png")).toBe(
			"https://cdn.myapp.com/avatar.png"
		);
	});

	it("applies the key prefix and preserves a publicDomain path", () => {
		const client = new StorageClient({
			...baseConfig,
			keyPrefix: "app/assets",
			publicDomain: "https://cdn.myapp.com/media",
		});

		expect(client.getPublicUrl("avatar.png")).toBe(
			"https://cdn.myapp.com/media/app/assets/avatar.png"
		);
	});
});

describe("StorageClient.getPresignedUrl", () => {
	it("generates a pre-signed GET URL with the default expiry", async () => {
		const client = new StorageClient(baseConfig);

		const url = await client.getPresignedUrl("report.pdf");

		expect(url).toContain("X-Amz-Signature=");
		expect(url).toContain("X-Amz-Expires=3600");
		expect(url).toContain("report.pdf");
		expect(url).toContain("x-id=GetObject");
	});

	it("honors a custom expiry and key prefix", async () => {
		const client = new StorageClient({
			...baseConfig,
			keyPrefix: "app/assets",
		});

		const url = await client.getPresignedUrl("report.pdf", 600);

		expect(url).toContain("X-Amz-Expires=600");
		expect(url).toContain("app/assets/report.pdf");
	});
});

describe("StorageClient.getPresignedUploadUrl", () => {
	it("generates a pre-signed PUT URL with the default expiry", async () => {
		const client = new StorageClient(baseConfig);

		const url = await client.getPresignedUploadUrl("report.pdf");

		expect(url).toContain("X-Amz-Signature=");
		expect(url).toContain("X-Amz-Expires=3600");
		expect(url).toContain("report.pdf");
		expect(url).toContain("x-id=PutObject");
	});

	it("signs a content type and honors a custom expiry", async () => {
		const client = new StorageClient(baseConfig);

		const url = await client.getPresignedUploadUrl("doc.pdf", {
			contentType: "application/pdf",
			expiresIn: 600,
		});

		expect(url).toContain("X-Amz-Expires=600");
		expect(url).toContain("doc.pdf");
	});
});

describe("StorageClient.listObjects", () => {
	it("lists objects with a prefix", async () => {
		const lastModified = new Date("2026-01-01T00:00:00.000Z");
		s3Mock.on(ListObjectsV2Command).resolves({
			IsTruncated: false,
			Contents: [
				{
					Key: "app/assets/a.png",
					Size: 10,
					LastModified: lastModified,
					ETag: "etag-a",
				},
			],
		});

		const client = new StorageClient({ ...baseConfig, keyPrefix: "app" });

		const objects = await client.listObjects("assets");

		expect(objects).toEqual([
			{
				key: "app/assets/a.png",
				size: 10,
				lastModified,
				etag: "etag-a",
			},
		]);

		const [call] = s3Mock.commandCalls(ListObjectsV2Command);
		expect(call!.args[0].input.Prefix).toBe("app/assets");
	});

	it("follows pagination until IsTruncated is false", async () => {
		s3Mock
			.on(ListObjectsV2Command)
			.resolvesOnce({
				IsTruncated: true,
				NextContinuationToken: "token-1",
				Contents: [{ Key: "a.txt" }],
			})
			.resolvesOnce({
				IsTruncated: false,
				Contents: [{ Key: "b.txt" }],
			});

		const client = new StorageClient(baseConfig);

		const objects = await client.listObjects();

		expect(objects.map((object) => object.key)).toEqual(["a.txt", "b.txt"]);

		const calls = s3Mock.commandCalls(ListObjectsV2Command);
		expect(calls).toHaveLength(2);
		expect(calls[1]!.args[0].input.ContinuationToken).toBe("token-1");
	});
});

describe("StorageClient.purgePrefix", () => {
	it("returns empty when no objects match", async () => {
		s3Mock.on(ListObjectsV2Command).resolves({
			IsTruncated: false,
			Contents: [],
		});

		const client = new StorageClient(baseConfig);

		await expect(client.purgePrefix("t/users")).resolves.toEqual({
			deleted: [],
			errors: [],
		});
	});

	it("deletes matching objects and reports deleted keys", async () => {
		s3Mock.on(ListObjectsV2Command).resolves({
			IsTruncated: false,
			Contents: [
				{ Key: "t/users/u1/1.txt" },
				{ Key: "t/users/u1/2.txt" },
			],
		});
		s3Mock.on(DeleteObjectsCommand).resolves({
			Deleted: [{ Key: "t/users/u1/1.txt" }, { Key: "t/users/u1/2.txt" }],
			Errors: [],
		});

		const client = new StorageClient(baseConfig);

		const result = await client.purgePrefix("t/users/u1");

		expect(result).toEqual({
			deleted: ["t/users/u1/1.txt", "t/users/u1/2.txt"],
			errors: [],
		});

		const [call] = s3Mock.commandCalls(DeleteObjectsCommand);
		expect(call!.args[0].input.Delete?.Objects).toEqual([
			{ Key: "t/users/u1/1.txt" },
			{ Key: "t/users/u1/2.txt" },
		]);
	});

	it("reports deletion errors", async () => {
		s3Mock.on(ListObjectsV2Command).resolves({
			IsTruncated: false,
			Contents: [{ Key: "t/users/u1/bad.txt" }],
		});
		s3Mock.on(DeleteObjectsCommand).resolves({
			Deleted: [],
			Errors: [
				{
					Key: "t/users/u1/bad.txt",
					Code: "AccessDenied",
					Message: "nope",
				},
			],
		});

		const client = new StorageClient(baseConfig);

		await expect(client.purgePrefix("t/users/u1")).resolves.toEqual({
			deleted: [],
			errors: [
				{
					key: "t/users/u1/bad.txt",
					code: "AccessDenied",
					message: "nope",
				},
			],
		});
	});
});
