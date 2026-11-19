import Fastify from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import { registerVersionedRoutes } from "../src/lib/routes";
import swaggerPlugin from "../src/plugins/openapi/swagger";

/**
 * The public paths of the OpenAPI document: `/{version}/{module}/{route}`.
 *
 * This list is independent of the application's route table, so that a
 * document that grows or loses a path fails before the snapshot diff.
 */
const PUBLIC_PATHS = [
	"/v1/audio/create_clone_voice",
	"/v1/audio/get_models",
	"/v1/audio/get_voices",
	"/v1/audio/music_compose",
	"/v1/audio/music_compose_plan",
	"/v1/audio/speech_to_speech",
	"/v1/audio/text_to_dialogue",
	"/v1/audio/text_to_speech",
	"/v1/audio/text_to_speech/with_timestamp",
	"/v1/character_ai/search_character",
	"/v1/character_ai/send_message",
	"/v1/character_ai/character_info",
	"/v1/instagram/get_media",
	"/v1/mtxx/clothes_segmentation",
	"/v1/mtxx/expression_generation",
	"/v1/mtxx/image_restoration",
	"/v1/mtxx/outpainting",
	"/v1/mtxx/remove_bg",
	"/v1/mtxx/versatile_hairstyle",
	"/v1/mtxx/get_task",
	"/v1/pixverse/text_to_video",
	"/v1/pixverse/image_to_video",
	"/v1/pixverse/get_task",
	"/v1/remini/create_task",
	"/v1/tiktok/get_content",
];

interface MediaTypeObject {
	schema?: Record<string, unknown>;
}

interface ResponseObject {
	content?: Record<string, MediaTypeObject>;
}

interface OperationObject {
	description?: string;
	requestBody?: { content?: Record<string, MediaTypeObject> };
	responses?: Record<string, ResponseObject>;
}

interface PathItem {
	get?: OperationObject;
	post?: OperationObject;
}

interface OpenApiDocument {
	components?: { schemas?: Record<string, unknown> };
	paths?: Record<string, PathItem>;
}

/**
 * Reads the POST operation of a path out of the generated document.
 */
const operation = (
	document: OpenApiDocument,
	path: string
): OperationObject | undefined => document.paths?.[path]?.post;

/**
 * Collects every object key in the document.
 *
 * The published document is JSON Schema. A Zod internal key such as `def`
 * or `shape` surviving into it means the transformers did not run.
 */
const collectKeys = (value: unknown, keys: Set<string>): void => {
	if (Array.isArray(value)) {
		for (const item of value) {
			collectKeys(item, keys);
		}
		return;
	}

	if (value && typeof value === "object") {
		for (const [key, child] of Object.entries(value)) {
			keys.add(key);
			collectKeys(child, keys);
		}
	}
};

describe("the public OpenAPI document", () => {
	it("pins the published contract to a snapshot", async () => {
		const app = Fastify();

		// `src/app.ts` installs the Zod compilers before the OpenAPI
		// plugin, and the plugin's transformers read the schemas the
		// compilers are registered against.
		app.setValidatorCompiler(validatorCompiler);
		app.setSerializerCompiler(
			createSerializerCompiler({
				stringify: (value: unknown) => JSON.stringify(value),
			})
		);

		await app.register(swaggerPlugin);
		await registerVersionedRoutes(app);
		await app.ready();

		// Scalar fetches `/openapi.json`, and Fastify serializes that
		// route's object to JSON. Serializing here too drops the
		// symbol-keyed transformer state `app.swagger()` carries in
		// process, leaving the document a caller actually receives.
		const document = JSON.parse(
			JSON.stringify(app.swagger())
		) as unknown as OpenApiDocument;
		const paths = Object.keys(document.paths ?? {});

		expect([...paths].sort()).toEqual([...PUBLIC_PATHS].sort());
		expect(paths).not.toContain("/auth");
		expect(paths).not.toContain("/hooks");
		expect(paths).not.toContain("/status");
		expect(paths).not.toContain("/openapi.json");

		// The document is the published contract, not its Zod sources.
		// `FailureSchema` is the component the 4XX/5XX responses `$ref`.
		expect(document.components?.schemas?.FailureSchema).toHaveProperty(
			"type",
			"object"
		);

		// The app transform wraps a 200 response in `SuccessSchema`, and
		// the Zod transformer renders it as JSON Schema: an object with
		// `properties`, never a Zod `def`.
		const envelope =
			document.paths?.["/v1/audio/get_models"]?.get?.responses?.["200"]
				?.content?.["application/json"]?.schema;
		expect(envelope).toBeDefined();
		expect(envelope).toHaveProperty("properties.ok");
		expect(envelope).toHaveProperty("properties.data");
		expect(envelope).not.toHaveProperty("def");
		expect(
			document.paths?.["/v1/audio/get_models"]?.get?.responses?.["4XX"]
				?.content?.["application/json"]?.schema
		).toEqual({ $ref: "#/components/schemas/FailureSchema" });

		const keys = new Set<string>();
		collectKeys(document, keys);
		expect(keys.has("def")).toBe(false);
		expect(keys.has("shape")).toBe(false);

		// The restored descriptions must survive into the document.
		expect(
			operation(document, "/v1/audio/text_to_dialogue")?.description
		).toContain("text_to_dialogue-output.wav");
		expect(
			operation(document, "/v1/mtxx/clothes_segmentation")?.description
		).toContain("Segmentation Mask");
		expect(
			operation(document, "/v1/mtxx/versatile_hairstyle")?.description
		).toContain("Hair types");
		expect(
			operation(document, "/v1/audio/create_clone_voice")?.requestBody
				?.content?.["multipart/form-data"]
		).toBeDefined();

		expect(document).toMatchSnapshot();

		await app.close();
	});
});
