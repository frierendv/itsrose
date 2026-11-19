import { outpainting, outpaintingSchema } from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const DESCRIPTION = `
Extends an image beyond its original canvas using AI outpainting.

<details>
	<summary>Example</summary>

| Original Image | Result Image |
|----------------|--------------------|
| ![Original Image](https://assets.itsrose.net/public-resource/girl-in-red-dress.jpg "Original Image") | ![Result Image](https://assets.itsrose.net/public-resource/girl-in-red-dress_outpainting_0_1.jpg "Expand 120% of original") |
| **Original** | **120% of original** |

</details>
`;

/**
 * Registers `POST /outpainting`.
 */
export const registerOutpaintingRoute = (fastify: FastifyInstance): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/outpainting",
		schema: {
			tags: ["Mtxx"],
			summary: "Outpainting",
			description: DESCRIPTION,
			body: outpaintingSchema.request,
			response: {
				200: outpaintingSchema.response,
			},
		},
		handler: async (request) => {
			const response = await outpainting(request.body);
			return response;
		},
	});
};
