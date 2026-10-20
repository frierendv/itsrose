import Swagger, { type SwaggerTransform } from "@fastify/swagger";
import { FailureSchema, SuccessSchema } from "@itsrose/api-response";
import fp from "fastify-plugin";
import {
	fastifyZodOpenApiPlugin,
	fastifyZodOpenApiTransformers,
} from "fastify-zod-openapi";
import { z } from "zod/v4";

const isZodType = (schema: unknown): schema is z.ZodType =>
	schema instanceof z.ZodType ||
	(typeof schema === "object" && schema !== null && "_zod" in schema);

const wrapWithSuccessSchema = (schema: z.ZodType): z.ZodType => {
	if (schema === SuccessSchema) {
		return schema;
	}
	return SuccessSchema.extend({
		data: schema,
	});
};

const wrap200Response = (response200: unknown): unknown => {
	if (isZodType(response200)) {
		return wrapWithSuccessSchema(response200);
	}

	if (response200 && typeof response200 === "object") {
		const resObj = response200 as {
			schema?: unknown;
			content?: Record<string, { schema?: unknown }>;
		};

		if (isZodType(resObj.schema)) {
			return {
				...resObj,
				schema: wrapWithSuccessSchema(resObj.schema),
			};
		}

		if (
			resObj.content?.["application/json"]?.schema &&
			isZodType(resObj.content["application/json"].schema)
		) {
			return {
				...resObj,
				content: {
					...resObj.content,
					"application/json": {
						...resObj.content["application/json"],
						schema: wrapWithSuccessSchema(
							resObj.content["application/json"].schema
						),
					},
				},
			};
		}
	}

	return response200;
};

const createErrorSchema = (description: string) => ({
	description,
	content: {
		"application/json": {
			schema: { $ref: "#/components/schemas/FailureSchema" },
		},
	},
});
const transform: SwaggerTransform = (opts) => {
	const clonedSchema = opts.schema ? { ...opts.schema } : opts.schema;

	if (
		clonedSchema &&
		typeof clonedSchema === "object" &&
		"response" in clonedSchema &&
		clonedSchema.response
	) {
		const response = {
			...(clonedSchema.response as Record<string | number, unknown>),
		};

		if (200 in response || "200" in response) {
			const res200 = response[200] ?? response["200"];
			response[200] = wrap200Response(res200);
		}

		response["4XX"] ??= createErrorSchema("Client Error");
		response["5XX"] ??= createErrorSchema("Server Error");

		clonedSchema.response = response;
	}

	return fastifyZodOpenApiTransformers.transform({
		...opts,
		schema: clonedSchema,
	});
};

export default fp(async (fastify) => {
	await fastify.register(fastifyZodOpenApiPlugin, {
		components: { schemas: { FailureSchema } },
	});

	await fastify.register(Swagger, {
		openapi: {
			info: {
				title: "ItsRose API",
				description: "API documentation for ItsRose services",
				version: "1.0.0",
			},
		},
		...fastifyZodOpenApiTransformers,
		transform,
	});

	void fastify.route({
		method: "GET",
		url: "/openapi.json",
		config: { authGuard: false },
		handler: () => fastify.swagger(),
		// Don't include this route in the OpenAPI spec to avoid recursion issues
		schema: { hide: true },
	});
});
