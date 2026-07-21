import Swagger from "@fastify/swagger";
import {
	extractMeta,
	FailureSchema,
	SuccessSchema,
} from "@itsrose/api-response";
import fp from "fastify-plugin";
import {
	fastifyZodOpenApiPlugin,
	fastifyZodOpenApiTransformers,
} from "fastify-zod-openapi";
import type { OpenAPIV3 } from "openapi-types";

type OpenAPIVDocument = Partial<OpenAPIV3.Document>;
type OpenAPIObject = {
	openapiObject: OpenAPIVDocument;
};

type SchemaField = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
type Response = OpenAPIV3.ResponseObject;

const SUCCESS_REF = "#/components/schemas/SuccessSchema";
const FAILURE_REF = "#/components/schemas/FailureSchema";

const isReferenceSchema = (
	schema: SchemaField
): schema is OpenAPIV3.ReferenceObject => "$ref" in schema;

// remove "meta" from array string
const removeMetaFromArray = (arr: string[]): string[] => {
	return arr.filter((item) => item !== "meta");
};

const extractSchemaContent = (
	schema: SchemaField
): {
	extracted: SchemaField;
	meta?: SchemaField;
} => {
	if (isReferenceSchema(schema)) {
		return { extracted: schema };
	}

	const { properties, required, ...rest } = schema;

	const { payload, meta } = extractMeta(properties ?? {});

	return {
		extracted: {
			type: "object",
			properties: payload,
			...(required ? { required: removeMetaFromArray(required) } : {}),
			...rest,
		},
		meta: meta as SchemaField | undefined,
	};
};

const wrapSchema = (
	schema: SchemaField,
	baseRef: string,
	field: string
): OpenAPIV3.SchemaObject => {
	const { extracted, meta } = extractSchemaContent(schema);

	const hasMeta = Object.keys(meta ?? {}).length > 0;
	const metaProps = (
		hasMeta
			? { type: "object", properties: { meta }, required: ["meta"] }
			: {}
	) as OpenAPIV3.SchemaObject;

	return {
		allOf: [
			{ $ref: baseRef },
			{
				type: "object",
				properties: { [field]: extracted },
				required: ["data"],
			},
			...(hasMeta ? [metaProps] : []),
		],
	};
};

const createErrorResponse = (
	description: string
): OpenAPIV3.ResponseObject => ({
	description,
	content: {
		"application/json": {
			schema: {
				$ref: FAILURE_REF,
			},
		},
	},
});

const CLIENT_ERROR_RESPONSE = createErrorResponse("Client Error");
const SERVER_ERROR_RESPONSE = createErrorResponse("Server Error");

const RESPONSE_WRAPPERS = {
	"2": (schema: SchemaField) => wrapSchema(schema, SUCCESS_REF, "data"),

	"4": (schema: SchemaField) => wrapSchema(schema, FAILURE_REF, "errors"),

	"5": (schema: SchemaField) => wrapSchema(schema, FAILURE_REF, "errors"),
} as const;

const transformResponse = (code: string, response: Response): Response => {
	const schema = response.content?.["application/json"]?.schema;

	if (!schema || typeof schema !== "object") {
		return response;
	}

	const wrapper =
		RESPONSE_WRAPPERS[code[0] as keyof typeof RESPONSE_WRAPPERS];

	if (!wrapper) {
		return response;
	}

	return {
		...response,
		content: {
			"application/json": {
				schema: wrapper(schema as SchemaField),
			},
		},
	};
};

const transformOperation = (operation: OpenAPIV3.OperationObject) => {
	for (const [code, response] of Object.entries(operation.responses)) {
		if (!response) {
			continue;
		}

		operation.responses[code] = transformResponse(
			code,
			response as Response
		);
	}

	operation.responses["4XX"] ??= CLIENT_ERROR_RESPONSE;
	operation.responses["5XX"] ??= SERVER_ERROR_RESPONSE;
};

const transformObject = (schema: unknown) => {
	const transformed = fastifyZodOpenApiTransformers.transformObject(
		schema as OpenAPIObject
	) as OpenAPIVDocument;

	for (const pathItem of Object.values(transformed.paths ?? {})) {
		if (!pathItem) {
			continue;
		}

		for (const operation of Object.values(pathItem)) {
			if (
				operation &&
				typeof operation === "object" &&
				"responses" in operation
			) {
				transformOperation(operation as OpenAPIV3.OperationObject);
			}
		}
	}

	return transformed;
};

export default fp(async (fastify) => {
	await fastify.register(fastifyZodOpenApiPlugin);

	await fastify.register(Swagger, {
		openapi: {
			info: {
				title: "ItsRose API",
				description: "API documentation for ItsRose services",
				version: "1.0.0",
			},
			components: {
				securitySchemes: {
					bearerAuth: {
						type: "http",
						scheme: "bearer",
						description:
							"API key authentication. Use the `Bearer` prefix followed by your API key.",
					},
				},
				schemas: {
					SuccessSchema: SuccessSchema.toJSONSchema() as object,
					FailureSchema: FailureSchema.toJSONSchema() as object,
				},
			},
		},
		transform: fastifyZodOpenApiTransformers.transform,
		transformObject,
	});

	fastify.route({
		method: "GET",
		url: "/openapi.json",
		handler: () => fastify.swagger(),
		// Don't include this route in the OpenAPI spec to avoid recursion issues
		schema: {
			hide: true,
		},
	});
});
