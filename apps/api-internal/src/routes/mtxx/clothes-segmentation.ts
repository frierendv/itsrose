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
			description: "Generate a mask for the clothes in the image.",
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
