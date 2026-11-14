import { FailureResponse } from "@itsrose/api-response";
import {
	InvalidRequestError,
	SystemError,
	ThirdPartyApiError,
} from "@itsrose/system";
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
	app.get("/system", async () => {
		throw new SystemError("the server is misconfigured");
	});
	app.get("/unknown", async () => {
		throw new Error("something went wrong");
	});
	app.get("/mapped", async () => {
		throw new Error("mapped");
	});
	app.get("/client-error", async () => {
		throw new Error("unsupported media type");
	});
	app.get("/unsupported-media-type", async () => {
		throw Object.assign(new Error("Unsupported Media Type"), {
			statusCode: 415,
		});
	});
	app.get("/failure", async () => {
		throw FailureResponse.create({
			code: "BAD_REQUEST",
			message: "already a failure",
			errors: {},
		});
	});
	app.get("/validation", async () => {
		throw Object.assign(new Error("body must have required property"), {
			validation: [
				{
					instancePath: "/voice_settings/speed",
					message: "Expected number, received string",
				},
			],
		});
	});
	app.get("/validation-path", async () => {
		throw Object.assign(new Error("body must have required property"), {
			validation: [
				{
					path: ["voice_settings", "speed"],
					message: "Expected number, received string",
				},
			],
		});
	});
	app.get("/validation-unknown", async () => {
		throw Object.assign(new Error("body must have required property"), {
			validation: [{ message: "Expected number, received string" }],
		});
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

	it("maps a system error to the internal error envelope", async () => {
		const app = await build();
		const response = await app.inject({ method: "GET", url: "/system" });

		expect(response.statusCode).toBe(500);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 3000,
			errors: { type: "INTERNAL_ERROR" },
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

	it("keeps the status of a client error", async () => {
		const app = await build();
		const response = await app.inject({
			method: "GET",
			url: "/client-error",
		});

		expect(response.statusCode).toBe(500);
		expect(response.json()).toMatchObject({
			ok: false,
			errors: { type: "UNHANDLED_EXCEPTION" },
		});
		await app.close();
	});

	it("keeps the status of an error Fastify raised for the request", async () => {
		const app = await build();
		const response = await app.inject({
			method: "GET",
			url: "/unsupported-media-type",
		});

		expect(response.statusCode).toBe(415);
		expect(response.json()).toMatchObject({
			ok: false,
			errors: { type: "INVALID_REQUEST" },
		});
		await app.close();
	});

	it("keeps a failure response as it is", async () => {
		const app = await build();
		const response = await app.inject({ method: "GET", url: "/failure" });

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			ok: false,
			message: "already a failure",
		});
		await app.close();
	});

	it("names the field of a validation issue", async () => {
		const app = await build();
		const response = await app.inject({
			method: "GET",
			url: "/validation",
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 2001,
			errors: {
				"voice_settings.speed": "Expected number, received string",
			},
		});
		await app.close();
	});

	it("names the field of a validation issue that carries a path", async () => {
		const app = await build();
		const response = await app.inject({
			method: "GET",
			url: "/validation-path",
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			ok: false,
			errors: {
				"voice_settings.speed": "Expected number, received string",
			},
		});
		await app.close();
	});

	it("names a validation issue without a field as such", async () => {
		const app = await build();
		const response = await app.inject({
			method: "GET",
			url: "/validation-unknown",
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toMatchObject({
			ok: false,
			errors: {
				unknown_field: "Expected number, received string",
			},
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
			errors: { type: "NOT_FOUND" },
		});
		await app.close();
	});
});
