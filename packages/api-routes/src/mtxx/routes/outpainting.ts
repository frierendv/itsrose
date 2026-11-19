import { outpainting, outpaintingSchema } from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { MtxxRoutesOptions } from "../options";

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
 * Registers `POST /outpainting` under the prefix of the module.
 */
export const registerOutpaintingRoute = (
	fastify: FastifyInstance,
	options: MtxxRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: joinUrl(prefix, "/outpainting"),
		schema: {
			tags: ["Mtxx"],
			summary: "Outpainting",
			description: options.descriptions?.outpainting ?? DESCRIPTION,
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
