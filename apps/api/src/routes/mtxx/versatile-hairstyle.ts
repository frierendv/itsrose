import {
	versatileHairstyle,
	versatileHairstyleCreateDescription,
	versatileHairstyleSchema,
} from "@itsrose/mtxx";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/versatile_hairstyle",
		schema: {
			tags: ["Mtxx"],
			summary: "Versatile Hairstyle",
			description: `
Versatile Hairstyle is a hairstyle that can be adapted to different occasions and styles.

<details>
		<summary>Example</summary>

| Original Image | Result Image |
|----------------|--------------------|
| ![Original Image](https://assets.itsrose.net/public-resource/girl-in-red-dress.jpg) | ![Versatile Hairstyle](https://assets.itsrose.net/public-resource/girl-in-red-dress_hair_type_0.jpg) |
| **Original** | **Hair type 0** |

</details>

<details>
	<summary>Hair types</summary>
${versatileHairstyleCreateDescription()}
</details>`,
			body: versatileHairstyleSchema.request,
			response: {
				200: versatileHairstyleSchema.response,
			},
		},
		handler: async (request) => {
			const response = await versatileHairstyle(request.body);
			return response;
		},
	});
};

export default route;
