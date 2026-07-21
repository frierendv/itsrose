import { fetcher } from "@itsrose/http-client";
import { TIKTOK_TIKWM_BASE_URL, TIKWM_APIKEY } from "../config";
import type { ITiktokRequest, ITiktokResponse } from "../zod-schema";
import { TiktokRequestSchema, TiktokResponseSchema } from "../zod-schema";

/**
 * Fetch and normalize TikTok content metadata from the TikWM service.
 *
 * @param options - TikTok request parameters.
 * @returns A normalized TikTok response payload.
 */
export const getContent = async (
	options: ITiktokRequest
): Promise<ITiktokResponse> => {
	const { data } = await fetcher<any>({
		baseURL: TIKTOK_TIKWM_BASE_URL,
		params: options,
		headers: { "api-key": TIKWM_APIKEY },
	});

	const result = data.data;
	// let zod handle these
	return {
		...result,
		media_list: {
			...result,
			cover: {
				...result,
				thumbnail: result.cover,
			},
			watermark: {
				url: result.wmplay,
				size: result.wm_size,
			},
			no_watermak: {
				url: result.play,
				size: result.size,
			},
			music: {
				...result.music_info,
				url: result.music_info.play,
				is_original: result.music_info.original,
			},
		},
		statistic: result,
	};
};

export const getContentSchema = {
	request: TiktokRequestSchema,
	response: TiktokResponseSchema,
};
