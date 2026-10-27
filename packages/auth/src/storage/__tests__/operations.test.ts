import type { S3 } from "@itsrose/s3";
import {
	createPresignedUpload,
	deleteEphemeralFile,
	deleteUserTempFiles,
	getEphemeralFileUrl,
	saveEphemeralFile,
} from "../operations";

describe("packages/auth/src/storage/operations", () => {
	const mockS3 = {
		upload: jest.fn().mockResolvedValue({
			key: "t/users/u123/exports/report.csv",
			publicUrl:
				"https://pub-cdn.itsrose.net/t/users/u123/exports/report.csv",
			etag: '"abc123etag"',
		}),
		getObjectPublicUrl: jest
			.fn()
			.mockImplementation(
				(key: string) => `https://pub-cdn.itsrose.net/${key}`
			),
		createPresignedDownloadUrl: jest
			.fn()
			.mockResolvedValue("https://s3.signed.download.url"),
		createPresignedUploadUrl: jest
			.fn()
			.mockResolvedValue("https://s3.signed.upload.url"),
		deleteObject: jest
			.fn()
			.mockResolvedValue({ key: "any", deleted: true }),
		purgePrefix: jest.fn().mockResolvedValue({
			deleted: [
				"t/users/u123/exports/1.csv",
				"t/users/u123/exports/2.csv",
			],
			errors: [],
		}),
	} as unknown as S3;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("saveEphemeralFile", () => {
		it("uploads file under t/users/{userId}/{category}/{filename}", async () => {
			const res = await saveEphemeralFile(
				{
					userId: "u123",
					category: "exports",
					filename: "report.csv",
					body: Buffer.from("id,name\n1,alice"),
					contentType: "text/csv",
				},
				mockS3
			);

			expect(res.key).toBe("t/users/u123/exports/report.csv");
			expect(res.publicUrl).toBe(
				"https://pub-cdn.itsrose.net/t/users/u123/exports/report.csv"
			);
			expect(mockS3.upload).toHaveBeenCalledWith(
				"t/users/u123/exports/report.csv",
				expect.any(Buffer),
				expect.objectContaining({
					contentType: "text/csv",
				})
			);
		});

		it("uploads system artifact under t/artifacts/{filename} when no userId is passed", async () => {
			const res = await saveEphemeralFile(
				{
					category: "artifacts",
					filename: "build-artifact.tar.gz",
					body: Buffer.from("archive"),
				},
				mockS3
			);

			expect(res.key).toBe("t/artifacts/build-artifact.tar.gz");
		});
	});

	describe("getEphemeralFileUrl", () => {
		it("resolves public URL by default", async () => {
			const url = await getEphemeralFileUrl(
				{
					key: "t/artifacts/data.json",
				},
				mockS3
			);

			expect(url).toBe(
				"https://pub-cdn.itsrose.net/t/artifacts/data.json"
			);
			expect(mockS3.getObjectPublicUrl).toHaveBeenCalledWith(
				"t/artifacts/data.json"
			);
		});

		it("generates presigned download URL when isPublic is false", async () => {
			const url = await getEphemeralFileUrl(
				{
					key: "t/users/u1/private/statement.pdf",
					isPublic: false,
					expiresInSeconds: 600,
				},
				mockS3
			);

			expect(url).toBe("https://s3.signed.download.url");
			expect(mockS3.createPresignedDownloadUrl).toHaveBeenCalledWith({
				key: "t/users/u1/private/statement.pdf",
				expiresInSeconds: 600,
			});
		});
	});

	describe("createPresignedUpload", () => {
		it("generates pre-signed upload URL for user file under t/", async () => {
			const result = await createPresignedUpload(
				{
					userId: "u123",
					category: "uploads",
					filename: "input.zip",
					contentType: "application/zip",
					expiresInSeconds: 1800,
				},
				mockS3
			);

			expect(result.key).toBe("t/users/u123/uploads/input.zip");
			expect(result.uploadUrl).toBe("https://s3.signed.upload.url");
			expect(result.publicUrl).toBe(
				"https://pub-cdn.itsrose.net/t/users/u123/uploads/input.zip"
			);
			expect(result.expiresIn).toBe(1800);
		});
	});

	describe("deleteEphemeralFile", () => {
		it("deletes single ephemeral file", async () => {
			const deleted = await deleteEphemeralFile(
				"t/artifacts/temp.bin",
				mockS3
			);
			expect(deleted).toBe(true);
			expect(mockS3.deleteObject).toHaveBeenCalledWith(
				"t/artifacts/temp.bin"
			);
		});
	});

	describe("deleteUserTempFiles", () => {
		it("purges user prefix t/users/{userId}/", async () => {
			const result = await deleteUserTempFiles("u123", mockS3);
			expect(result.userId).toBe("u123");
			expect(result.deleted.length).toBe(2);
			expect(mockS3.purgePrefix).toHaveBeenCalledWith(
				"t/users/u123/",
				expect.any(Object)
			);
		});
	});
});
