import type { StorageClient } from "@itsrose/s3";
import {
	createUserPresignedUpload,
	deleteUserFile,
	deleteUserTempFiles,
	getUserFileUrl,
	listUserFiles,
	purgeUserStorage,
	uploadUserFile,
} from "../src/operations";

function createS3() {
	return {
		upload: jest.fn(async () => ({ etag: "etag-1" })),
		getPublicUrl: jest.fn((key: string) => `https://cdn.example/${key}`),
		getPresignedUrl: jest.fn(async () => "https://signed.example/get"),
		getPresignedUploadUrl: jest.fn(
			async () => "https://signed.example/put"
		),
		delete: jest.fn(async () => {}),
		purgePrefix: jest.fn(async () => ({ deleted: 2, errors: 0 })),
		listObjects: jest.fn(async () => [
			{
				key: "t/users/user-1/images/pic.png",
				size: 10,
				lastModified: "2026-11-05T00:00:00.000Z",
				etag: "e",
			},
			{ key: "t/users/user-1/invalid.txt" },
		]),
	};
}

type FakeS3 = ReturnType<typeof createS3>;
const asClient = (s3: FakeS3) => s3 as unknown as StorageClient;

describe("user storage operations", () => {
	it("purges temp files with a sanitized prefix", async () => {
		const s3 = createS3();
		await expect(
			deleteUserTempFiles("user-1", asClient(s3))
		).resolves.toEqual({
			userId: "user-1",
			deleted: 2,
			errors: 0,
		});
		expect(s3.purgePrefix).toHaveBeenCalledWith("t/users/user-1/");
	});

	it("lists files and parses their keys", async () => {
		const s3 = createS3();
		const files = await listUserFiles(asClient(s3), "user-1", "images");
		expect(files).toHaveLength(1);
		expect(files[0]).toMatchObject({
			key: "t/users/user-1/images/pic.png",
			userId: "user-1",
			category: "images",
			filename: "pic.png",
			publicUrl: "https://cdn.example/t/users/user-1/images/pic.png",
		});
	});

	it("purges all user storage", async () => {
		const s3 = createS3();
		await expect(purgeUserStorage(asClient(s3), "user-1")).resolves.toEqual(
			{
				userId: "user-1",
				deleted: 2,
				errors: 0,
			}
		);
	});

	it("uploads, deletes and signs user files", async () => {
		const s3 = createS3();
		const uploaded = await uploadUserFile(
			asClient(s3),
			"user-1",
			"avatars",
			"me.png",
			Buffer.from("x")
		);
		expect(uploaded.key).toBe("t/users/user-1/avatars/me.png");

		await expect(
			deleteUserFile(asClient(s3), "user-1", "avatars", "me.png")
		).resolves.toBe(true);
		expect(s3.delete).toHaveBeenCalledWith("t/users/user-1/avatars/me.png");

		const presigned = await createUserPresignedUpload(
			asClient(s3),
			"user-1",
			"avatars",
			"me.png"
		);
		expect(presigned.uploadUrl).toBe("https://signed.example/put");

		expect(
			getUserFileUrl(asClient(s3), "user-1", "avatars", "me.png")
		).toBe("https://cdn.example/t/users/user-1/avatars/me.png");
	});
});
