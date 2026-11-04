import type { StorageClient } from "@itsrose/s3";
import { getStorageClient } from "./client";
import { MUTABLE_CACHE_CONTROL } from "./config";
import {
	buildEphemeralKey,
	buildUserEphemeralKey,
	buildUserPrefix,
	parseUserStorageKey,
	sanitizeCategory,
	sanitizeFilename,
	sanitizeUserId,
} from "./keys";
import type {
	CreatePresignedUploadParams,
	EphemeralFileResult,
	GetEphemeralUrlParams,
	PresignedUploadOptions,
	PresignedUploadResult,
	SaveEphemeralFileParams,
	UserStorageFile,
	UserStoragePurgeResult,
} from "./types";

type StoragePayload = Buffer | string;

interface UploadFileOptions {
	contentType?: string;
	cacheControl?: string;
}

/**
 * Resolves the public URL for a key, throwing when no public domain is configured.
 */
function resolvePublicUrl(s3: StorageClient, key: string): string {
	const url = s3.getPublicUrl(key);
	if (!url) {
		throw new Error(`No public URL is configured for key "${key}".`);
	}
	return url;
}

/**
 * Resolves or builds a valid ephemeral key rooted under `t/`.
 */
function resolveEphemeralKey(
	params:
		| { key: string }
		| { userId?: string; category?: string; filename?: string }
): string {
	if ("key" in params && params.key) {
		const clean = params.key.trim().replace(/^\/+|\/+$/g, "");
		return clean.startsWith("t/") ? clean : `t/${clean}`;
	}

	if ("userId" in params && params.userId) {
		return buildUserEphemeralKey({
			userId: params.userId,
			category: params.category ?? "temp",
			filename: params.filename ?? "file",
		});
	}

	const category =
		("category" in params ? params.category : undefined) ?? "artifacts";
	const filename =
		("filename" in params ? params.filename : undefined) ?? "file";
	return buildEphemeralKey(category, filename);
}

/**
 * Saves an ephemeral file under `t/` (e.g. `t/users/{userId}/{category}/{filename}` or `t/artifacts/{jobId}/{filename}`).
 * Automatically relies on Lifecycle Rules for deletion.
 */
export async function saveEphemeralFile(
	params: SaveEphemeralFileParams,
	client?: StorageClient
): Promise<EphemeralFileResult> {
	const s3 = client ?? getStorageClient();
	const key = resolveEphemeralKey(params);

	const uploadResult = await s3.upload(key, params.body, {
		contentType: params.contentType,
		cacheControl: params.cacheControl ?? MUTABLE_CACHE_CONTROL,
	});

	return {
		key,
		publicUrl: resolvePublicUrl(s3, key),
		etag: uploadResult.etag,
		contentType: params.contentType,
	};
}

/**
 * Resolves a public CDN URL or short-lived pre-signed download URL for an ephemeral file.
 */
export async function getEphemeralFileUrl(
	params: GetEphemeralUrlParams,
	client?: StorageClient
): Promise<string> {
	const s3 = client ?? getStorageClient();

	if (params.isPublic !== false) {
		return resolvePublicUrl(s3, params.key);
	}

	return s3.getPresignedUrl(params.key, params.expiresInSeconds ?? 900);
}

/**
 * Generates a scoped pre-signed upload URL for direct client uploads under `t/`.
 */
export async function createPresignedUpload(
	params: CreatePresignedUploadParams,
	client?: StorageClient
): Promise<PresignedUploadResult> {
	const s3 = client ?? getStorageClient();
	const key = resolveEphemeralKey(params);
	const expiresIn = params.expiresInSeconds ?? 900; // 15 mins default

	const uploadUrl = await s3.getPresignedUploadUrl(key, {
		contentType: params.contentType,
		expiresIn,
	});

	const publicUrl = resolvePublicUrl(s3, key);

	return {
		key,
		uploadUrl,
		publicUrl,
		expiresIn,
	};
}

/**
 * Explicitly deletes an ephemeral file by key.
 * Used only for explicit manual user actions (e.g. user manually deletes an export).
 */
export async function deleteEphemeralFile(
	key: string,
	client?: StorageClient
): Promise<boolean> {
	const s3 = client ?? getStorageClient();
	await s3.delete(key);
	return true;
}

/**
 * Immediate cleanup for a specific user: purges all ephemeral files prefixed under `t/users/{userId}/`.
 * Used for explicit user cleanup actions or account deletion.
 * All other background expiration is delegated entirely to R2 1-day lifecycle rules.
 */
export async function deleteUserTempFiles(
	userId: string,
	client?: StorageClient
): Promise<UserStoragePurgeResult> {
	const s3 = client ?? getStorageClient();
	const validUserId = sanitizeUserId(userId);
	const prefix = buildUserPrefix(validUserId);

	const result = await s3.purgePrefix(prefix);

	return {
		userId: validUserId,
		deleted: result.deleted,
		errors: result.errors,
	};
}

/**
 * Lists ephemeral files belonging to a user, optionally filtered by category.
 */
export async function listUserFiles(
	s3OrUserId: StorageClient | string,
	userIdOrCategory?: string,
	maybeCategory?: string
): Promise<UserStorageFile[]> {
	const s3 = typeof s3OrUserId === "string" ? getStorageClient() : s3OrUserId;
	const userId =
		typeof s3OrUserId === "string" ? s3OrUserId : (userIdOrCategory ?? "");
	const category =
		typeof s3OrUserId === "string" ? userIdOrCategory : maybeCategory;

	const validUserId = sanitizeUserId(userId);
	const prefix = category
		? `${buildUserPrefix(validUserId)}${sanitizeCategory(category)}/`
		: buildUserPrefix(validUserId);

	const objects = (await s3.listObjects(prefix)) ?? [];
	const results: UserStorageFile[] = [];

	for (const obj of objects) {
		const parsed = parseUserStorageKey(obj.key);
		if (parsed) {
			results.push({
				key: obj.key,
				userId: parsed.userId,
				category: parsed.category,
				filename: parsed.filename,
				publicUrl: resolvePublicUrl(s3, obj.key),
				size: obj.size,
				lastModified: obj.lastModified,
				etag: obj.etag,
			});
		}
	}

	return results;
}

/**
 * High-performance recursive deletion helper to purge all keys prefixed under `t/users/{userId}/`
 * when a user account is deleted.
 */
export async function purgeUserStorage(
	s3OrUserId: StorageClient | string,
	maybeUserId?: string
): Promise<UserStoragePurgeResult> {
	const s3 = typeof s3OrUserId === "string" ? getStorageClient() : s3OrUserId;
	const userId =
		typeof s3OrUserId === "string" ? s3OrUserId : (maybeUserId ?? "");
	return deleteUserTempFiles(userId, s3);
}

/**
 * Uploads a user-scoped ephemeral file: `t/users/{userId}/{category}/{filename}`.
 */
export async function uploadUserFile(
	s3OrUserId: StorageClient | string,
	userIdOrCategory: string,
	categoryOrFilename: string,
	filenameOrData: string | StoragePayload,
	dataOrOptions?: StoragePayload | UploadFileOptions,
	maybeOptions?: UploadFileOptions
): Promise<UserStorageFile> {
	let s3: StorageClient;
	let userId: string;
	let category: string;
	let filename: string;
	let data: StoragePayload;
	let options: UploadFileOptions | undefined;

	if (typeof s3OrUserId === "string") {
		s3 = getStorageClient();
		userId = s3OrUserId;
		category = userIdOrCategory;
		filename = categoryOrFilename;
		data = filenameOrData as StoragePayload;
		options = dataOrOptions as UploadFileOptions | undefined;
	} else {
		s3 = s3OrUserId;
		userId = userIdOrCategory;
		category = categoryOrFilename;
		filename = filenameOrData as string;
		data = dataOrOptions as StoragePayload;
		options = maybeOptions;
	}

	const res = await saveEphemeralFile(
		{
			userId,
			category,
			filename,
			body: data,
			contentType: options?.contentType,
			cacheControl: options?.cacheControl,
		},
		s3
	);

	return {
		key: res.key,
		userId: sanitizeUserId(userId),
		category: sanitizeCategory(category),
		filename: sanitizeFilename(filename),
		publicUrl: res.publicUrl,
		etag: res.etag,
		contentType: res.contentType,
	};
}

/**
 * Deletes a specific user ephemeral file.
 */
export async function deleteUserFile(
	s3OrUserId: StorageClient | string,
	userIdOrCategory: string,
	categoryOrFilename: string,
	maybeFilename?: string
): Promise<boolean> {
	const s3 = typeof s3OrUserId === "string" ? getStorageClient() : s3OrUserId;
	const userId =
		typeof s3OrUserId === "string" ? s3OrUserId : userIdOrCategory;
	const category =
		typeof s3OrUserId === "string" ? userIdOrCategory : categoryOrFilename;
	const filename =
		typeof s3OrUserId === "string"
			? categoryOrFilename
			: (maybeFilename ?? "");

	const key = buildUserEphemeralKey(userId, category, filename);
	return deleteEphemeralFile(key, s3);
}

/**
 * Generates a scoped pre-signed upload URL for direct user uploads.
 */
export async function createUserPresignedUpload(
	s3OrUserId: StorageClient | string,
	userIdOrCategory: string,
	categoryOrFilename: string,
	filenameOrOptions?: string | PresignedUploadOptions,
	maybeOptions?: PresignedUploadOptions
): Promise<PresignedUploadResult> {
	let s3: StorageClient;
	let userId: string;
	let category: string;
	let filename: string;
	let options: PresignedUploadOptions | undefined;

	if (typeof s3OrUserId === "string") {
		s3 = getStorageClient();
		userId = s3OrUserId;
		category = userIdOrCategory;
		filename = categoryOrFilename;
		options = filenameOrOptions as PresignedUploadOptions | undefined;
	} else {
		s3 = s3OrUserId;
		userId = userIdOrCategory;
		category = categoryOrFilename;
		filename = filenameOrOptions as string;
		options = maybeOptions;
	}

	return createPresignedUpload(
		{
			userId,
			category,
			filename,
			contentType: options?.contentType,
			expiresInSeconds: options?.expiresIn,
		},
		s3
	);
}

/**
 * Resolves the public URL for a user ephemeral file.
 */
export function getUserFileUrl(
	s3OrUserId: StorageClient | string,
	userIdOrCategory: string,
	categoryOrFilename: string,
	maybeFilename?: string
): string {
	const s3 = typeof s3OrUserId === "string" ? getStorageClient() : s3OrUserId;
	const userId =
		typeof s3OrUserId === "string" ? s3OrUserId : userIdOrCategory;
	const category =
		typeof s3OrUserId === "string" ? userIdOrCategory : categoryOrFilename;
	const filename =
		typeof s3OrUserId === "string"
			? categoryOrFilename
			: (maybeFilename ?? "");

	const key = buildUserEphemeralKey(userId, category, filename);
	return resolvePublicUrl(s3, key);
}
