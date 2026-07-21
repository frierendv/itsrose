import { clothesSegmentation, clothesSegmentationSchema } from "@itsrose/mtxx";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/clothes_segmentation",
		schema: {
			tags: ["Mtxx"],
			summary: "Clothes Segmentation",
			description: `
Generate a mask for the clothes in the image.

<details>
		<summary>Example</summary>

| Original Image | Segmentation Mask | Segmentation Labels |
|----------------|--------------------|--------------------|
| ![Original Image](https://assets.itsrose.net/public-resource/girl-in-red-dress.jpg "Original Image") | ![Segmentation Mask](https://assets.itsrose.net/public-resource/girl-in-red-dress_segmentation_mask.jpg "Segmentation Mask") | ![Label dress](https://assets.itsrose.net/public-resource/girl-in-red-dress_clothes_segmentation_label_dress.jpg "Label dress") |
| **Original** | **Segmentation Mask** | **Label dress** |

</details>
`,
			body: clothesSegmentationSchema.request,
			response: {
				200: clothesSegmentationSchema.response,
			},
		},
		handler: async (request) => {
			const response = await clothesSegmentation(request.body);
			return response;
		},
	});
};

export default route;
