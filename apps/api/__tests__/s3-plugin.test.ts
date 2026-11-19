import type { AuthServer } from "@itsrose/auth/server";
import type { FastifyInstance, FastifyRequest } from "fastify";
import Fastify from "fastify";
import fp from "fastify-plugin";
import s3Plugin from "../src/plugins/app/03-s3";

type Upload = (
	userId: string,
	category: string,
	filename: string,
	file: unknown
) => Promise<{ publicUrl?: string }>;

interface UploadCall {
	userId: string;
	category: string;
	filename: string;
	file: unknown;
}

/**
 * Builds an application with a stand-in auth server and the real s3 plugin.
 *
 * The plugin only needs `auth.$context.storage`, so the stub can drive the
 * decorator without Better Auth, a database or a network.
 */
const buildApp = async (
	upload: Upload
): Promise<{ app: FastifyInstance; calls: UploadCall[] }> => {
	const calls: UploadCall[] = [];
	const app = Fastify();

	const auth = {
		$context: Promise.resolve({
			storage: {
				uploadUserFile: async (
					userId: string,
					category: string,
					filename: string,
					file: unknown
				) => {
					calls.push({ userId, category, filename, file });
					return upload(userId, category, filename, file);
				},
			},
		}),
	} as unknown as AuthServer;

	await app.register(
		fp(
			async (fastify) => {
				fastify.decorate("auth", auth);
			},
			{ name: "auth" }
		)
	);
	await app.register(s3Plugin);
	await app.ready();

	return { app, calls };
};

const REQUEST = { userId: "usr_1" } as unknown as FastifyRequest;
const ANONYMOUS = { userId: null } as unknown as FastifyRequest;

describe("the s3 plugin", () => {
	it("returns the public url and preprocesses the payload", async () => {
		const { app, calls } = await buildApp(async () => ({
			publicUrl: "https://cdn.test/audio.wav",
		}));

		const url = await app.s3.uploadUserFileUrl(REQUEST, "YXVkaW8=", {
			category: "audio",
			preprocess: (data) => Buffer.from(data, "base64"),
		});

		expect(url).toBe("https://cdn.test/audio.wav");
		expect(calls[0]?.category).toBe("audio");
		expect(calls[0]?.userId).toBe("usr_1");
		expect(Buffer.isBuffer(calls[0]?.file)).toBe(true);

		await app.close();
	});

	it("fails instead of passing the payload off as a url", async () => {
		const { app } = await buildApp(async () => ({}));

		await expect(
			app.s3.uploadUserFileUrl(ANONYMOUS, "payload")
		).rejects.toThrow(/no user/);
		await expect(
			app.s3.uploadUserFileUrl(REQUEST, "payload")
		).rejects.toThrow(/no public URL/);

		await app.close();
	});

	it("keeps uploadUserFile inline for an unauthenticated request", async () => {
		const { app } = await buildApp(async () => ({
			publicUrl: "https://cdn.test/audio.wav",
		}));

		await expect(app.s3.uploadUserFile(ANONYMOUS, "payload")).resolves.toBe(
			"payload"
		);

		await app.close();
	});
});
