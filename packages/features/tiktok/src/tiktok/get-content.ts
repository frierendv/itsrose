import { parseUpstreamPayload } from "@itsrose/upstream-client";
import { httpClient } from "../client";
import type { ITiktokRequest, ITiktokResponse } from "../zod-schema";
import {
	TiktokRequestSchema,
	TiktokResponseSchema,
	TikwmResponseSchema,
} from "../zod-schema";

/**
 * Fetch and normalize TikTok content metadata from the TikWM service.
 *
 * The upstream TikWM payload is parsed with its own schema (it is a
 * third-party contract) and mapped to the normalized, `snake_case` payload
 * described by {@linkcode TiktokResponseSchema}.
 *
 * @param options - TikTok request parameters.
 * @returns A normalized TikTok response payload.
 * @throws {UpstreamApiError} If the upstream call failed or the payload did
 * not match the published schema.
 */
export const getContent = async (
	options: ITiktokRequest
): Promise<ITiktokResponse> => {
	const upstream = await httpClient.send({
		params: options,
		schema: TikwmResponseSchema,
	});
	const result = upstream.data;

	return parseUpstreamPayload(
		TiktokResponseSchema,
		{
			aweme_id: result.aweme_id,
			id: result.id,
			region: result.region,
			author: {
				id: result.author.id,
				unique_id: result.author.unique_id,
				nickname: result.author.nickname,
				avatar: result.author.avatar,
			},
			title: result.title,
			media_list: {
				cover: {
					thumbnail: result.cover,
					ai_dynamic_cover: result.ai_dynamic_cover ?? result.cover,
					origin_cover: result.origin_cover ?? result.cover,
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
					id: result.music_info.id,
					title: result.music_info.title,
					url: result.music_info.play,
					cover: result.music_info.cover,
					author: result.music_info.author,
					is_original:
						result.music_info.is_original ??
						result.music_info.original,
					duration: result.music_info.duration,
				},
				images: null,
			},
			statistic: {
				play_count: result.statistics?.play_count ?? 0,
				digg_count: result.statistics?.digg_count ?? 0,
				comment_count: result.statistics?.comment_count ?? 0,
				share_count: result.statistics?.share_count ?? 0,
				download_count: result.statistics?.download_count ?? 0,
				collect_count: result.statistics?.collect_count ?? 0,
			},
		},
		{ service: "tiktok", label: "content" }
	);
};

export const getContentSchema = {
	request: TiktokRequestSchema,
	response: TiktokResponseSchema,
};
