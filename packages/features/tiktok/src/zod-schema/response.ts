import { z } from "zod/v4";

const AuthorSchema = z.object({
	id: z.string(),
	unique_id: z.string(),
	nickname: z.string(),
	avatar: z.string(),
});

const CoverMediaSchema = z.object({
	/** `data.cover` */
	thumbnail: z.url(),
	ai_dynamic_cover: z.url(),
	origin_cover: z.url(),
});

const MusicSchema = z.object({
	id: z.string(),
	title: z.string(),
	// play
	url: z.string(),
	cover: z.string(),
	author: z.string(),
	// original
	is_original: z.boolean(),
	duration: z.number(),
});

const BasicMediaSchema = z.object({
	url: z.url(),
	size: z.number(),
});

const StatisticSchema = z.object({
	play_count: z.number(),
	digg_count: z.number(),
	comment_count: z.number(),
	share_count: z.number(),
	download_count: z.number(),
	collect_count: z.number(),
});

export const TiktokResponseSchema = z.object({
	aweme_id: z.string(),
	id: z.string(),
	region: z.string(),
	author: AuthorSchema,
	title: z.string(),

	media_list: z.object({
		cover: CoverMediaSchema,
		watermark: BasicMediaSchema,
		no_watermak: BasicMediaSchema,
		music: MusicSchema,
		images: z.array(z.url()).nullish().default(null),
	}),
	statistic: StatisticSchema,
});

export type ITiktokResponse = z.infer<typeof TiktokResponseSchema>;
