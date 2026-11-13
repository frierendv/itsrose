import type { BetterAuthPlugin } from "better-auth";
import {
	APIError,
	createAuthEndpoint,
	createAuthMiddleware,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import { getStorageClient } from "./client";
import {
	createPresignedUpload,
	deleteUserFile,
	deleteUserTempFiles,
	listUserFiles,
	uploadUserFile,
} from "./operations";
import type { PresignedUploadOptions, StoragePluginOptions } from "./types";

export const presignedUploadSchema = z.object({
	category: z.string().default("uploads"),
	filename: z.string().min(1, "Filename is required."),
	content_type: z.string().optional(),
	expires_in: z.number().int().min(60).max(86400).optional(),
});

export const listFilesSchema = z.object({
	category: z.string().optional(),
});

export const deleteFileSchema = z.object({
	category: z.string().min(1, "Category is required."),
	filename: z.string().min(1, "Filename is required."),
});

/**
 * Standard Better Auth server plugin for user ephemeral storage rooted under `t/`.
 * Relies on Cloudflare R2 1-day lifecycle rules for automatic expiration.
 */
export function storagePlugin(options: StoragePluginOptions = {}) {
	const s3 = options.s3 ?? getStorageClient(options.config);

	return {
		id: "storage",
		endpoints: {
			/**
			 * Generates a scoped pre-signed upload URL for direct client-to-S3 uploads.
			 */
			createPresignedUpload: createAuthEndpoint(
				"/storage/presigned-upload",
				{
					method: "POST",
					use: [sessionMiddleware],
					body: presignedUploadSchema,
				},
				async (ctx) => {
					const { user } = ctx.context.session;
					try {
						const result = await createPresignedUpload(
							{
								userId: user.id,
								category: ctx.body.category,
								filename: ctx.body.filename,
								contentType: ctx.body.content_type,
								expiresInSeconds: ctx.body.expires_in,
							},
							s3
						);
						return ctx.json(result);
					} catch (error) {
						const message =
							error instanceof Error
								? error.message
								: "Failed to generate upload URL.";
						throw new APIError("BAD_REQUEST", { message });
					}
				}
			),

			/**
			 * Lists ephemeral files belonging to the authenticated user.
			 */
			listFiles: createAuthEndpoint(
				"/storage/files",
				{
					method: "GET",
					use: [sessionMiddleware],
					query: listFilesSchema,
				},
				async (ctx) => {
					const { user } = ctx.context.session;
					try {
						const files = await listUserFiles(
							s3,
							user.id,
							ctx.query?.category
						);
						return ctx.json({ files });
					} catch (error) {
						const message =
							error instanceof Error
								? error.message
								: "Failed to list files.";
						throw new APIError("INTERNAL_SERVER_ERROR", {
							message,
						});
					}
				}
			),

			/**
			 * Deletes a specific file belonging to the user.
			 */
			deleteFile: createAuthEndpoint(
				"/storage/files/delete",
				{
					method: "POST",
					use: [sessionMiddleware],
					body: deleteFileSchema,
				},
				async (ctx) => {
					const { user } = ctx.context.session;
					try {
						const deleted = await deleteUserFile(
							s3,
							user.id,
							ctx.body.category,
							ctx.body.filename
						);
						return ctx.json({ deleted });
					} catch (error) {
						const message =
							error instanceof Error
								? error.message
								: "Failed to delete file.";
						throw new APIError("INTERNAL_SERVER_ERROR", {
							message,
						});
					}
				}
			),
		},

		hooks: {
			after: [
				{
					matcher: (context) => {
						return Boolean(
							context.path === "/user/delete" ||
							context.path === "/delete-user" ||
							context.path?.endsWith("/delete-user")
						);
					},
					handler: createAuthMiddleware(async (ctx) => {
						if (options.autoPurgeOnAccountDelete !== false) {
							const userId = ctx.context.session?.user?.id;
							if (userId) {
								void deleteUserTempFiles(userId, s3).catch(
									(err) => {
										ctx.context.logger?.error?.(
											`[storagePlugin] Failed to purge storage for deleted user "${userId}"`,
											err
										);
									}
								);
							}
						}
					}),
				},
			],
		},

		init: () => ({
			context: {
				storage: {
					s3,
					uploadUserFile: (
						userId: string,
						category: string,
						filename: string,
						data: Buffer | string
					) => uploadUserFile(s3, userId, category, filename, data),
					purgeUserStorage: (userId: string) =>
						deleteUserTempFiles(userId, s3),
					listUserFiles: (userId: string, category?: string) =>
						listUserFiles(s3, userId, category),
					deleteUserFile: (
						userId: string,
						category: string,
						filename: string
					) => deleteUserFile(s3, userId, category, filename),
					createPresignedUpload: (
						userId: string,
						category: string,
						filename: string,
						opts?: PresignedUploadOptions
					) =>
						createPresignedUpload(
							{
								userId,
								category,
								filename,
								contentType: opts?.contentType,
								expiresInSeconds: opts?.expiresIn,
							},
							s3
						),
				},
			},
		}),
	} satisfies BetterAuthPlugin;
}

declare module "better-auth" {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface BetterAuthPluginRegistry<AuthOptions, Options> {
		storage: {
			creator: typeof storagePlugin;
		};
	}
}
