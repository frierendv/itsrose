import type { ParseMediaUrl } from "../../types";
import type { IMediaNode } from "../../zod-schema";

export type VideoDropperMedia<K extends "video" | "image" = "video" | "image"> =
	{
		[P in K]: (P extends "video"
			? { [P in K]: string } & { thumbnail: string }
			: string)[];
	};

export const parseMediaUrl: ParseMediaUrl<VideoDropperMedia> = (media) => {
	const items: IMediaNode[] = [];

	if ("video" in media) {
		for (const { video } of media.video) {
			items.push({ url: video, is_video: true });
		}
	}
	if ("image" in media) {
		for (const url of media.image) {
			items.push({ url, is_video: false });
		}
	}

	return items;
};
