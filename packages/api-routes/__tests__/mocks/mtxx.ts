/**
 * The MTXX client, replaced by a stub.
 */
import {
	ClothesSegmentationResponseSchema,
	ExpressionGenerationRequestSchema,
	GetTaskSchema,
	ImageRestorationRequestSchema,
	OutpaintingRequestSchema,
	SharedRequestSchema,
	SharedResponseSchema,
	VersatileHairstyleRequestSchema,
} from "../../../features/mtxx/src/zod-schema";

const RESPONSE = {
	status: "completed",
	task_id: "task",
	media_list: ["https://mtxx.test/result.jpg"],
};

export const clothesSegmentation = async () => ({
	segmentation_mask: ["https://mtxx.test/mask.jpg"],
	labels: [
		{
			label: "dress",
			n_label: "1",
			url: "https://mtxx.test/dress.jpg",
		},
	],
});
export const clothesSegmentationSchema = {
	request: SharedRequestSchema,
	response: ClothesSegmentationResponseSchema,
};

export const expressionGeneration = async () => RESPONSE;
export const expressionGenerationSchema: {
	request: typeof ExpressionGenerationRequestSchema;
	response: typeof SharedResponseSchema;
} = {
	request: ExpressionGenerationRequestSchema,
	response: SharedResponseSchema,
};

export const imageRestoration = async () => RESPONSE;
export const imageRestorationSchema: {
	request: typeof ImageRestorationRequestSchema;
	response: typeof SharedResponseSchema;
} = {
	request: ImageRestorationRequestSchema,
	response: SharedResponseSchema,
};

export const outpainting = async () => RESPONSE;
export const outpaintingSchema: {
	request: typeof OutpaintingRequestSchema;
	response: typeof SharedResponseSchema;
} = {
	request: OutpaintingRequestSchema,
	response: SharedResponseSchema,
};

export const removeBg = async () => RESPONSE;
export const removeBgSchema: {
	request: typeof SharedRequestSchema;
	response: typeof SharedResponseSchema;
} = {
	request: SharedRequestSchema,
	response: SharedResponseSchema,
};

export const versatileHairstyle = async () => RESPONSE;
export const versatileHairstyleSchema: {
	request: typeof VersatileHairstyleRequestSchema;
	response: typeof SharedResponseSchema;
} = {
	request: VersatileHairstyleRequestSchema,
	response: SharedResponseSchema,
};

export const getTask = async () => RESPONSE;
export const getTaskSchema: {
	request: typeof GetTaskSchema;
	response: typeof SharedResponseSchema;
} = {
	request: GetTaskSchema,
	response: SharedResponseSchema,
};
