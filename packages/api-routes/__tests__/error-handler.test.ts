import { FailureResponse } from "@itsrose/api-response";
import { InvalidRequestError, ThirdPartyApiError } from "@itsrose/system";
import Fastify from "fastify";
import { apiErrorHandler, type ErrorMapper } from "../src/error-handler";

const build = async (errorMappers?: ErrorMapper[]) => {
	const app = Fastify();

	await app.register(apiErrorHandler, { errorMappers });
	app.get("/boom", async () => {
		throw new ThirdPartyApiError("upstream is down", 503);
	});
	app.get("/invalid", async () => {
		throw new InvalidRequestError("not allowed");
	});
	app.get("/unknown", async () => {
		throw new Error("something went wrong");
	});
	app.get("/mapped", async () => {
		throw new Error("mapped");
	});

	await app.ready();
	return app;
};

describe("the shared error handler", () => {
	it("maps a third party error to the failure envelope", async () => {
		const app = await build();
		const response = await app.inject({ method: "GET", url: "/boom" });

		expect(response.statusCode).toBe(503);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 3200,
			errors: { type: "EXTERNAL_SERVICE_ERROR" },
		});
		await app.close();
	});

	it("maps an invalid request to the failure envelope", async () => {
		const app = await build();
		const response = await app.inject({ method: "GET", url: "/invalid" });

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			ok: false,
			errors: { type: "INVALID_REQUEST" },
		});
		await app.close();
	});

	it("maps an unknown error to the catch-all envelope", async () => {
		const app = await build();
		const response = await app.inject({ method: "GET", url: "/unknown" });

		expect(response.statusCode).toBe(500);
		expect(response.json()).toMatchObject({
			ok: false,
			errors: { type: "UNHANDLED_EXCEPTION" },
		});
		await app.close();
	});

	it("lets the app map the errors it knows about", async () => {
		const mapper: ErrorMapper = (error, _request, reply) => {
			if (error.message !== "mapped") {
				return false;
			}

			reply.status(418).send(
				FailureResponse.create({
					code: "BAD_REQUEST",
					message: error.message,
					errors: {},
				})
			);
			return true;
		};

		const app = await build([mapper]);
		const response = await app.inject({ method: "GET", url: "/mapped" });

		expect(response.statusCode).toBe(418);
		expect(response.json()).toMatchObject({ ok: false });
		await app.close();
	});

	it("answers an unknown url with the not found envelope", async () => {
		const app = await build();
		const response = await app.inject({ method: "GET", url: "/nowhere" });

		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({
			ok: false,
			errors: {},
		});
		await app.close();
	});
});
