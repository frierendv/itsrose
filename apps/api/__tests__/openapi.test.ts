import swagger from "@fastify/swagger";
import Fastify from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import { stubRouteEnv, unstubRouteEnv } from "./route-env";

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
		unstubRouteEnv();
	});
});
