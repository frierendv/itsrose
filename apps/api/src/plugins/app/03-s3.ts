import { createHash, randomUUID } from "node:crypto";
import type { AuthServer } from "@itsrose/auth/server";
import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";

interface Options<TData = unknown> {
	category?: string;
	filename?: string;
	preprocess?: (data: TData) => unknown;
}

interface S3Plugin {
	uploadUserFile: <TData, TOptions extends Options<TData> = Options<TData>>(
		request: FastifyRequest,
		data: TData,
		options?: TOptions
	) => Promise<TData | string>;

	deleteUserFile: (
		request: FastifyRequest,
		options: Required<Pick<Options, "category" | "filename">>
	) => Promise<boolean>;
}

const uploadUserFile = async <TData, TOptions extends Options<TData>>(
	auth: AuthServer,
	request: FastifyRequest,
	data: TData,
	options: TOptions = {} as TOptions
): Promise<TData | string> => {
	if (!request.userId) {
		return data;
	}

	const file = options.preprocess ? options.preprocess(data) : data;
	const filename =
		options.filename ??
		(Buffer.isBuffer(file)
			? createHash("sha256").update(file).digest("hex").slice(0, 16)
			: randomUUID());

	const { storage } = await auth.$context;
	const { publicUrl } = await storage.uploadUserFile(
		request.userId,
		options.category ?? "temp",
		filename,
		file as never
	);

	return publicUrl ?? (data as TData);
};

const deleteUserFile = async (
	auth: AuthServer,
	request: FastifyRequest,
	options: Required<Pick<Options, "category" | "filename">>
): Promise<boolean> => {
	if (!request.userId) {
		return false;
	}

	const { storage } = await auth.$context;

	return storage.deleteUserFile(
		request.userId,
		options.category,
		options.filename
	);
};

export default fp(
	async (fastify) => {
		if (!fastify.auth) {
			void fastify.decorate("s3", {
				uploadUserFile: async (_request, data, _options) => data,
				deleteUserFile: async (_request, _options) => false,
			} satisfies S3Plugin);

			return;
		}

		void fastify.decorate("s3", {
			uploadUserFile: (request, data, options) =>
				uploadUserFile(fastify.auth, request, data, options),
			deleteUserFile: (request, options) =>
				deleteUserFile(fastify.auth, request, options),
		} satisfies S3Plugin);
	},
	{ dependencies: ["auth"] }
);

declare module "fastify" {
	interface FastifyInstance {
		s3: S3Plugin;
	}
}
