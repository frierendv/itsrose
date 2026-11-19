import swagger from "@fastify/swagger";
import Fastify from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import { vi } from "vitest";

/**
 * The feature clients read their credentials from the environment when they
 * are imported, and the route modules import them. The values are never used,
 * and `vi.stubEnv` keeps the test from touching the real environment.
 */
const ROUTE_ENV: Record<string, string> = {
	CAI_USER_TOKEN: "test-cai-user-token",
	CAI_NEO_BASE_URL: "https://character-ai.test",
	ELEVENLABS_API_KEY: "test-elevenlabs-key",
	MTXX_APP_VERSION: "1.0.0",
	MTXX_SDK_BASE_URL: "https://mtxx-sdk.test",
	MTXX_OPENAPI_BASE_URL: "https://mtxx-openapi.test",
	MTXX_KEY: "test-mtxx-key",
	MTXX_SECRET: "test-mtxx-secret",
	PIXVERSE_API_KEY: "test-pixverse-key",
	PIXVERSE_BASE_URL: "https://pixverse.test",
	REMINI_API_BASE_URL: "https://remini-api.test",
	REMINI_WSS_BASE_URL: "wss://remini-wss.test",
	TIKTOK_TIKWM_BASE_URL: "https://tikwm.test",
	TIKTOK_TIKWM_APIKEY: "test-tikwm-key",
};

const stubRouteEnv = (): void => {
	for (const [key, value] of Object.entries(ROUTE_ENV)) {
		vi.stubEnv(key, value);
	}
};

interface OperationObject {
	description?: string;
	requestBody?: { content?: Record<string, unknown> };
}

/**
 * Reads the POST operation of a path out of the generated document.
 */
const operation = (
	document: { paths?: Record<string, unknown> },
	path: string
): OperationObject | undefined => {
	const item = document.paths?.[path] as
		Record<string, OperationObject> | undefined;

	return item?.post;
};

describe("the public OpenAPI document", () => {
	it("publishes the restored examples and the multipart clone voice", async () => {
		stubRouteEnv();

		const { audioRoutes } = await import("@itsrose/api-routes/audio");
		const { mtxxRoutes } = await import("@itsrose/api-routes/mtxx");

		const app = Fastify();
		await app.register(swagger, {
			openapi: {
				openapi: "3.1.0",
				info: { title: "ItsRose", version: "1" },
			},
		});
		app.setValidatorCompiler(validatorCompiler);
		app.setSerializerCompiler(
			createSerializerCompiler({
				stringify: (value) => JSON.stringify(value),
			})
		);

		await app.register(audioRoutes, {
			prefix: "/audio",
			uploadAudioToStorage: false,
			declareAudioResponseHeader: true,
		});
		await app.register(mtxxRoutes, { prefix: "/mtxx" });
		await app.ready();

		const document = app.swagger() as unknown as {
			paths?: Record<string, unknown>;
		};

		expect(
			operation(document, "/audio/create_clone_voice")?.requestBody
				?.content?.["multipart/form-data"]
		).toBeDefined();
		expect(
			operation(document, "/audio/text_to_dialogue")?.description
		).toContain("text_to_dialogue-output.wav");
		expect(
			operation(document, "/mtxx/clothes_segmentation")?.description
		).toContain("Segmentation Mask");
		expect(
			operation(document, "/mtxx/versatile_hairstyle")?.description
		).toContain("Hair types");

		await app.close();
		vi.unstubAllEnvs();
	});
});
