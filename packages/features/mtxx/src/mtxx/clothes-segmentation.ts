import { parseUpstreamPayload } from "@itsrose/upstream-client";
import { client, type MediaInfo } from "../client";
import { SEGMENTATION_CLOTH_MAP } from "../constants/clothes-segmentation";
import {
	ClothesSegmentationResponseSchema,
	SharedRequestSchema,
	type IClothesSegmentationResponse,
	type ISharedRequest,
} from "../zod-schema";

/** @internal type for the segmentation response from the API */
type SResponse = {
	media_info_list: (MediaInfo & { mask_label?: string })[];
};

/**
 * Segments clothing and garments in an input image, extracting labeled category masks.
 *
 * @param {ISharedRequest} opts Options configuration containing the input image details.
 * @returns {Promise<IClothesSegmentationResponse>} A promise resolving to the segmentation masks and labeled clothing categories.
 * @throws {UpstreamApiError} If the upstream call failed or the segmentation did
 * not match the published schema.
 */
export const clothesSegmentation = async (
	opts: ISharedRequest
): Promise<IClothesSegmentationResponse> => {
	const { init_image } = opts;
	const options = {
		parameter: {
			rsp_media_type: "url",
		},
		media_info_list: [
			{
				media_data: init_image.value,
				media_extra: {},
				media_profiles: {
					media_data_type: init_image.type,
				},
			},
		],
		extra: {},
	};
	const { media_info_list } = await client.createMtlabTask<SResponse>({
		url: "/v1/clothsegment",
		data: options,
	});

	const segmentation: IClothesSegmentationResponse = {
		segmentation_mask: [],
		labels: [],
	};

	for (const item of media_info_list) {
		if (!item?.mask_label) {
			segmentation.segmentation_mask.push(item.media_data);
			// stop current iteration if have mask_label.
			continue;
		}
		// push the segmentation mask and label to the response object
		segmentation.labels.push({
			label: SEGMENTATION_CLOTH_MAP[
				item.mask_label
			] as IClothesSegmentationResponse["labels"][number]["label"],
			n_label: item.mask_label,
			url: item.media_data,
		});
	}

	return parseUpstreamPayload(
		ClothesSegmentationResponseSchema,
		segmentation,
		{ service: "mtxx", label: "segmentation" }
	);
};
/** @internal */
export const clothesSegmentationSchema = {
	request: SharedRequestSchema,
	response: ClothesSegmentationResponseSchema,
};
