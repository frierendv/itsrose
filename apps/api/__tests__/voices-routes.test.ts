import type { ProviderResource } from "@itsrose/auth-resources/types";
import {
	VoiceNotFoundError,
	type ListVoicesInput,
	type RecordVoiceInput,
	type RemoveAllVoicesForUserInput,
	type RemoveVoiceInput,
	type VoiceService,
} from "@itsrose/auth-resources/voices";
import type { AuthServer } from "@itsrose/auth/server";
import Fastify, { type FastifyInstance } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import apiResponsePlugin from "../src/plugins/openapi/api-response";
import voicesRoutes from "../src/routes/voices";

const USER_ID = "user-1";
const VOICE_ID = "voice-1";

const RECORD: ProviderResource = {
	resource_id: "resource-1",
	provider: "elevenlabs",
	provider_resource_id: VOICE_ID,
	tenant_id: "tenant-1",
	user_id: USER_ID,
	kind: "voice",
	name: "Narrator",
	sample_asset_id: null,
	status: "active",
	created_at: new Date("2026-11-20T00:00:00.000Z"),
	deleted_at: null,
};

type ServiceCalls = {
	list: ListVoicesInput[];
	record: RecordVoiceInput[];
	remove: RemoveVoiceInput[];
	removeAllForUser: RemoveAllVoicesForUserInput[];
};

type ServiceOptions = {
	/** Makes the ledger delete reject, e.g. with `VoiceNotFoundError`. */
	removeError?: Error;
};

type BuildOptions = ServiceOptions & {
	/** `null` means the caller has no session; omitted means a valid one. */
	session?: { user: { id: string } } | null;
};

type BuiltApp = {
	app: FastifyInstance;
	calls: ServiceCalls;
	sessionInputs: unknown[];
};

/**
 * Builds the voice ledger over the recording fake the app expects.
 */
function createService(options: ServiceOptions = {}): {
	service: VoiceService;
	calls: ServiceCalls;
} {
	const calls: ServiceCalls = {
		list: [],
		record: [],
		remove: [],
		removeAllForUser: [],
	};

	const service: VoiceService = {
		async record(input) {
			calls.record.push(input);
			return RECORD;
		},
		async list(input) {
			calls.list.push(input);
			return [RECORD];
		},
		async remove(input) {
			calls.remove.push(input);
			if (options.removeError) {
				throw options.removeError;
			}
		},
		async removeAllForUser(input) {
			calls.removeAllForUser.push(input);
			return { deleted: 0, failed: [] };
		},
	};

	return { service, calls };
}

/**
 * Builds a bare app with the Zod compilers, a fake session server, the fake
 * voice service and the shared error handler the app installs.
 */
async function buildApp(options: BuildOptions = {}): Promise<BuiltApp> {
	const { service, calls } = createService(options);
	const session =
		options.session === undefined
			? { user: { id: USER_ID } }
			: options.session;
	const sessionInputs: unknown[] = [];

	const app = Fastify();
	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(
		createSerializerCompiler({
			stringify: (value: unknown) => JSON.stringify(value),
		})
	);

	const auth = {
		api: {
			async getSession(input: unknown) {
				sessionInputs.push(input);
				return session;
			},
		},
	} as unknown as AuthServer;

	app.decorate("auth", auth);
	app.decorate("voiceService", service);

	await app.register(apiResponsePlugin);
	await app.register(voicesRoutes);
	await app.ready();

	return { app, calls, sessionInputs };
}

describe("DELETE /voices/:voice_id", () => {
	it("deletes the voice through the service under the session user", async () => {
		const { app, calls, sessionInputs } = await buildApp();

		const response = await app.inject({
			method: "DELETE",
			url: `/voices/${VOICE_ID}`,
			headers: { cookie: "better-auth.session_token=test" },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ deleted: true });
		expect(calls.remove).toEqual([
			{ userId: USER_ID, providerResourceId: VOICE_ID },
		]);
		expect(sessionInputs).toHaveLength(1);
		expect(
			(sessionInputs[0] as { headers: Record<string, string> }).headers
				.cookie
		).toContain("session_token");

		await app.close();
	});

	it("answers 401 without a session, whatever API credential is sent", async () => {
		const { app, calls } = await buildApp({ session: null });

		const response = await app.inject({
			method: "DELETE",
			url: `/voices/${VOICE_ID}`,
			headers: {
				authorization: "Bearer api-key",
				"x-auth-token": "true",
			},
		});

		expect(response.statusCode).toBe(401);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 2101,
			data: null,
			errors: { session: "Sign in to the dashboard and retry." },
		});
		expect(calls.remove).toEqual([]);

		await app.close();
	});

	it("maps a missing or foreign voice to 404 without saying which", async () => {
		const { app } = await buildApp({
			removeError: new VoiceNotFoundError(VOICE_ID),
		});

		const response = await app.inject({
			method: "DELETE",
			url: `/voices/${VOICE_ID}`,
		});

		expect(response.statusCode).toBe(404);
		const body = response.json();
		expect(body).toMatchObject({
			ok: false,
			code: 2301,
			errors: { voice_id: VOICE_ID },
		});
		// The service raises the same error for a foreign voice, a deleted
		// one and one that never existed; the message must not disambiguate.
		expect(body.message).not.toMatch(/owner|another|foreign|forbidden/i);

		await app.close();
	});
});
