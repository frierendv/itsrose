import { FailureResponse, SuccessResponse } from "@itsrose/api-response";
import Fastify, { type FastifyInstance } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import { MTXX_ROUTE_PREFIX, mtxxRoutes } from "../src/mtxx";
import { PIXVERSE_ROUTE_PREFIX, pixverseRoutes } from "../src/pixverse";

interface CapturedRoute {
	method: string;
	url: string;
	config?: Record<string, unknown>;
}

/**
 * Registers the modules of an application and returns the config of the
 * routes it serves.
 */
const capture = async (
	register: (app: FastifyInstance) => Promise<void>
): Promise<CapturedRoute[]> => {
	const routes: CapturedRoute[] = [];
	const app = Fastify();

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(
		createSerializerCompiler({
			stringify(value) {
				if (
					value instanceof SuccessResponse ||
					value instanceof FailureResponse
				) {
					return JSON.stringify(value);
				}
				return JSON.stringify(
					new SuccessResponse({ data: value, code: "OK" })
				);
			},
		})
	);

	app.addHook("onRoute", (routeOptions) => {
		if (routeOptions.method === "HEAD") {
			return;
		}

		routes.push({
			method: Array.isArray(routeOptions.method)
				? routeOptions.method.join(",")
				: String(routeOptions.method),
			url: routeOptions.url,
			config: routeOptions.config as unknown as
				Record<string, unknown> | undefined,
		});
	});

	await register(app);
	await app.ready();
	await app.close();

	return routes;
};

describe("the route config of a module", () => {
	it("leaves task polling free but bounded", async () => {
		const routes = await capture(async (app) => {
			await app.register(mtxxRoutes, { prefix: MTXX_ROUTE_PREFIX });
			await app.register(pixverseRoutes, {
				prefix: PIXVERSE_ROUTE_PREFIX,
			});
		});

		for (const url of ["/mtxx/get_task", "/pixverse/get_task"]) {
			const route = routes.find((candidate) => candidate.url === url);

			expect(route?.config).toEqual({
				billable: false,
				rateLimit: { max: 600, timeWindow: 60_000 },
			});
		}
	});
});
