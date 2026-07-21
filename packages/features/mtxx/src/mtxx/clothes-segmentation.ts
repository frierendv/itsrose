import { client, type MediaInfo } from "../client";
import {
	ClothesSegmentationResponseSchema,
	SharedRequestSchema,
	type IClothesSegmentationResponse,
	type ISharedRequest,
} from "../zod-schema";

const SEGMENTATION_CLOTH_MAP: Record<string, string> = {
	"0": "background",
	"1": "headpiece",
	"2": "hair",
	"3": "gloves",
	"4": "glasses",
	"5": "top",
	"6": "dress",
	"7": "coat",
	"8": "socks",
	"9": "pants",
	"10": "skin",
	"11": "scarf etc.",
	"12": "skirt",
	"13": "face",
	"14": "shoes",
	"15": "bag",
	"16": "accessories",
	"17": "jumpsuit",
	"18": "mannequin_stand",
};

// @internal type for the segmentation response from the API
type SResponse = {
	media_info_list: (MediaInfo & { mask_label?: string })[];
};
export const clothesSegmentation = async (request: ISharedRequest) => {
	const { init_image } = request;
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
	return segmentation;
};
/** @internal */
export const clothesSegmentationSchema = {
	request: SharedRequestSchema,
	response: ClothesSegmentationResponseSchema,
};
