/**
 * The MTXX client, replaced by a stub.
 */
import {
	ClothesSegmentationResponseSchema,
	ExpressionGenerationRequestSchema,
	ImageRestorationRequestSchema,
	OutpaintingRequestSchema,
	SharedRequestSchema,
	SharedResponseSchema,
	VersatileHairstyleRequestSchema,
} from "../../../features/mtxx/src/zod-schema";

export const clothesSegmentation = async () => ({ images: [] });
export const clothesSegmentationSchema = {
	request: SharedRequestSchema,
	response: ClothesSegmentationResponseSchema,
};

export const expressionGeneration = async () => ({ image_url: "" });
export const expressionGenerationSchema: {
	request: typeof ExpressionGenerationRequestSchema;
	response: typeof SharedResponseSchema;
} = {
	request: ExpressionGenerationRequestSchema,
	response: SharedResponseSchema,
};

export const imageRestoration = async () => ({ image_url: "" });
export const imageRestorationSchema: {
	request: typeof ImageRestorationRequestSchema;
	response: typeof SharedResponseSchema;
} = {
	request: ImageRestorationRequestSchema,
	response: SharedResponseSchema,
};

export const outpainting = async () => ({ image_url: "" });
export const outpaintingSchema: {
	request: typeof OutpaintingRequestSchema;
	response: typeof SharedResponseSchema;
} = {
	request: OutpaintingRequestSchema,
	response: SharedResponseSchema,
};

export const removeBg = async () => ({ image_url: "" });
export const removeBgSchema: {
	request: typeof SharedRequestSchema;
	response: typeof SharedResponseSchema;
} = {
	request: SharedRequestSchema,
	response: SharedResponseSchema,
};

export const versatileHairstyle = async () => ({ image_url: "" });
export const versatileHairstyleSchema: {
	request: typeof VersatileHairstyleRequestSchema;
	response: typeof SharedResponseSchema;
} = {
	request: VersatileHairstyleRequestSchema,
	response: SharedResponseSchema,
};
