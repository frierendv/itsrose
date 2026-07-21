import { z } from "zod/v4";

export const MediaNodeSchema = z.object({
	url: z.url().describe("The direct URL to the media file."),
	is_video: z.boolean().describe("Indicates whether the media is a video."),
});
export type IMediaNode = z.infer<typeof MediaNodeSchema>;
