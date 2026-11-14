/**
 * The TikTok client, replaced by a stub.
 */
import {
	TiktokRequestSchema,
	TiktokResponseSchema,
} from "../../../features/tiktok/src/zod-schema";

export const getContent = async () => ({
	aweme_id: "aweme",
	id: "id",
	region: "ID",
	author: {
		id: "1",
		unique_id: "unique",
		nickname: "nickname",
		avatar: "https://tiktok.test/avatar.jpg",
	},
	title: "title",
	media_list: {
		cover: {
			thumbnail: "https://tiktok.test/cover.jpg",
			ai_dynamic_cover: "https://tiktok.test/cover.jpg",
			origin_cover: "https://tiktok.test/cover.jpg",
		},
		watermark: { url: "https://tiktok.test/watermark.mp4", size: 1 },
		no_watermak: { url: "https://tiktok.test/video.mp4", size: 1 },
		music: {
			id: "1",
			title: "title",
			url: "https://tiktok.test/music.mp3",
			cover: "https://tiktok.test/cover.jpg",
			author: "nickname",
			is_original: false,
			duration: 10,
		},
		images: null,
	},
	statistic: {
		play_count: 0,
		digg_count: 0,
		comment_count: 0,
		share_count: 0,
		download_count: 0,
		collect_count: 0,
	},
});
export const getContentSchema = {
	request: TiktokRequestSchema,
	response: TiktokResponseSchema,
};
