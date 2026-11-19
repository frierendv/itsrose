import {
	expressionGeneration,
	expressionGenerationSchema,
} from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const DESCRIPTION = `
This interface is used to process requests generated for smile expressions in the cloud.

<details>
	<summary>Example</summary>

| Original Image | Result Image |
|----------------|--------------------|
| ![Original Image](https://assets.itsrose.net/public-resource/girl-in-red-dress.jpg "Original Image") | ![Expression generation 0](https://assets.itsrose.net/public-resource/girl-in-red-dress_expression_generation_0.jpg "Smile mode 0") |
| **Original** | **Smile Mode 0** |

</details>
`;

/**
 * Registers `POST /expression_generation`.
 */
export const registerExpressionGenerationRoute = (
	fastify: FastifyInstance
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/expression_generation",
		schema: {
			tags: ["Mtxx"],
			summary: "Expression Generation",
			description: DESCRIPTION,
			body: expressionGenerationSchema.request,
			response: {
				200: expressionGenerationSchema.response,
			},
		},
		handler: async (request) => {
			const response = await expressionGeneration(request.body);
			return response;
		},
	});
};
