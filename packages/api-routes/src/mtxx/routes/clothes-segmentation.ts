import { clothesSegmentation, clothesSegmentationSchema } from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { MtxxRoutesOptions } from "../options";

const DESCRIPTION = "Generate a mask for the clothes in the image.";

/**
 * Registers `POST /clothes_segmentation` under the prefix of the module.
 */
export const registerClothesSegmentationRoute = (
	fastify: FastifyInstance,
	options: MtxxRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: joinUrl(prefix, "/clothes_segmentation"),
		schema: {
			tags: ["Mtxx"],
			summary: "Clothes Segmentation",
			description:
				options.descriptions?.clothesSegmentation ?? DESCRIPTION,
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
