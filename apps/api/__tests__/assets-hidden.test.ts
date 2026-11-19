import Fastify from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import swaggerPlugin from "../src/plugins/openapi/swagger";
import assetsRoutes from "../src/routes/assets";

interface OpenApiDocument {
	paths?: Record<string, unknown>;
}

/**
 * Reads the published document the way a caller does.
 *
 * Scalar fetches `/openapi.json` and Fastify serializes that route's object;
 * serializing here too drops the symbol-keyed transformer state `swagger()`
 * carries in process.
 */
const publishedPaths = async (): Promise<string[]> => {
	const app = Fastify();

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(
		createSerializerCompiler({
			stringify: (value: unknown) => JSON.stringify(value),
		})
	);

	await app.register(swaggerPlugin);
	await app.register(assetsRoutes);
	await app.ready();

	const document = JSON.parse(
		JSON.stringify(app.swagger())
	) as OpenApiDocument;
	const paths = Object.keys(document.paths ?? {});

	await app.close();
	return paths;
};

describe("the published OpenAPI document", () => {
	it("does not contain the asset endpoints", async () => {
		const paths = await publishedPaths();

		// The whole document is empty here: the only other registered route is
		// `/openapi.json`, which is hidden as well.
		expect(paths.filter((path) => path.startsWith("/assets"))).toEqual([]);
		expect(paths).toEqual([]);
	});
});
