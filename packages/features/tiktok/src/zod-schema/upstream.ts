import { z } from "zod/v4";

/**
 * Schemas describing the **upstream** TikWM (`tikwm.com`) payload.
 *
 * These keys mirror the third-party response verbatim (`music_info`, `wmplay`,
 * …) and are therefore NOT part of our own wire format. They are parsed at the
 * boundary and mapped to the normalized, `snake_case` payload described by
 * {@linkcode TiktokResponseSchema}.
 */

export const TikwmAuthorSchema = z.object({
	id: z.string().default(""),
	unique_id: z.string().default(""),
	nickname: z.string().default(""),
	avatar: z.string().default(""),
});

export const TikwmMusicSchema = z.object({
	id: z.string().default(""),
	title: z.string().default(""),
	/** Upstream field holding the music URL. */
	play: z.string().default(""),
	cover: z.string().default(""),
	author: z.string().default(""),
	duration: z.number().default(0),
	/** Upstream flag telling whether the sound is original. */
	original: z.boolean().default(false),
	is_original: z.boolean().optional(),
});

export const TikwmStatisticSchema = z.object({
	play_count: z.number().default(0),
	digg_count: z.number().default(0),
	comment_count: z.number().default(0),
	share_count: z.number().default(0),
	download_count: z.number().default(0),
	collect_count: z.number().default(0),
});

export const TikwmDataSchema = z.object({
	id: z.string().default(""),
	aweme_id: z.string().default(""),
	region: z.string().default(""),
	title: z.string().default(""),
	author: TikwmAuthorSchema.prefault({}),
	cover: z.string().default(""),
	ai_dynamic_cover: z.string().optional(),
	origin_cover: z.string().optional(),
	/** Upstream field holding the watermark-free video URL. */
	play: z.string().default(""),
	size: z.number().default(0),
	/** Upstream field holding the watermarked video URL. */
	wmplay: z.string().default(""),
	wm_size: z.number().default(0),
	/** Upstream field holding the music metadata. */
	music_info: TikwmMusicSchema.prefault({}),
	statistics: TikwmStatisticSchema.optional(),
});

export const TikwmResponseSchema = z.object({
	code: z.number().optional(),
	msg: z.string().optional(),
	data: TikwmDataSchema,
});

export type ITikwmResponse = z.infer<typeof TikwmResponseSchema>;
export type ITikwmData = z.infer<typeof TikwmDataSchema>;
