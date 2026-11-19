import { createHash, randomUUID } from "node:crypto";
import type { AuthServer } from "@itsrose/auth/server";
import { SystemError } from "@itsrose/system";
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

	/**
	 * Stores a user file and returns its public URL.
	 *
	 * Unlike `uploadUserFile`, this never falls back to the payload: a caller
	 * that needs a URL gets one, or the request fails. Returning the base64
	 * payload under a header that promised a URL is the bug this prevents.
	 */
	uploadUserFileUrl: <TData>(
		request: FastifyRequest,
		data: TData,
		options?: Options<TData>
	) => Promise<string>;

	/**
	 * Stores API-generated output and returns its public URL.
	 *
	 * The `generated` storage class is fixed here rather than chosen by the
	 * caller: the object lands under `t/users/{userId}/generated/…`, is read
	 * through its public URL and expires under the 1-day lifecycle rule. It is
	 * not counted against the storage entitlement until it is promoted.
	 */
	uploadGeneratedFileUrl: <TData>(
		request: FastifyRequest,
		data: TData,
		options?: Options<TData>
	) => Promise<string>;

	deleteUserFile: (
		request: FastifyRequest,
		options: Required<Pick<Options, "category" | "filename">>
	) => Promise<boolean>;
}

/**
 * The filename used when the caller does not name the file.
 */
const resolveFilename = (file: unknown): string =>
	Buffer.isBuffer(file)
		? createHash("sha256").update(file).digest("hex").slice(0, 16)
		: randomUUID();

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
	const filename = options.filename ?? resolveFilename(file);

	const { storage } = await auth.$context;
	const { publicUrl } = await storage.uploadUserFile(
		request.userId,
		options.category ?? "temp",
		filename,
		file as never
	);

	return publicUrl ?? (data as TData);
};

const uploadUserFileUrl = async <TData>(
	auth: AuthServer,
	request: FastifyRequest,
	data: TData,
	options: Options<TData> = {}
): Promise<string> => {
	if (!request.userId) {
		throw new SystemError(
			"Cannot store a user file: the request carries no user."
		);
	}

	const file = options.preprocess ? options.preprocess(data) : data;
	const filename = options.filename ?? resolveFilename(file);

	const { storage } = await auth.$context;
	const { publicUrl } = await storage.uploadUserFile(
		request.userId,
		options.category ?? "temp",
		filename,
		file as never
	);

	if (!publicUrl) {
		throw new SystemError(
			`The object storage returned no public URL for "${filename}".`
		);
	}

	return publicUrl;
};

/**
 * The category API-generated output is stored under.
 *
 * It selects the `generated` storage class: rooted at `t/`, readable through
 * its public URL, expired after one day and never counted against the storage
 * entitlement until a copy is promoted into the library.
 */
const GENERATED_CATEGORY = "generated";

/**
 * Stores API-generated output under the generated class.
 *
 * Delegates to {@link uploadUserFileUrl} so the no-user and no-public-URL
 * failure modes stay identical, and applies the category after the caller's
 * options so a caller cannot override it.
 */
const uploadGeneratedFileUrl = <TData>(
	auth: AuthServer,
	request: FastifyRequest,
	data: TData,
	options: Options<TData> = {}
): Promise<string> =>
	uploadUserFileUrl(auth, request, data, {
		...options,
		category: GENERATED_CATEGORY,
	});

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
				uploadUserFileUrl: async () => {
					throw new SystemError(
						"Object storage is not configured for this application."
					);
				},
				uploadGeneratedFileUrl: async () => {
					throw new SystemError(
						"Object storage is not configured for this application."
					);
				},
				deleteUserFile: async (_request, _options) => false,
			} satisfies S3Plugin);

			return;
		}

		void fastify.decorate("s3", {
			uploadUserFile: (request, data, options) =>
				uploadUserFile(fastify.auth, request, data, options),
			uploadUserFileUrl: (request, data, options) =>
				uploadUserFileUrl(fastify.auth, request, data, options),
			uploadGeneratedFileUrl: (request, data, options) =>
				uploadGeneratedFileUrl(fastify.auth, request, data, options),
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
