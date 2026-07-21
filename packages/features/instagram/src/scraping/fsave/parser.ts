import type { IMediaNode } from "../../zod-schema";
import { decodeTokenizedUri, isVideoUrl } from "../helpers";

const DOWNLOAD_SECTION_REGEX =
	/>?<div\s+class=\\"download-items\\">([\s\S]+?)<\/div><\/div>/g;
const DOWNLOAD_LINK_REGEX = /<a\s+onclick.+?href=\\"(.+?)\\"/;

export function parseMediaUrl(markup: string) {
	const sections = markup.match(DOWNLOAD_SECTION_REGEX);
	if (!sections) {
		return [];
	}
	const items: IMediaNode[] = [];
	for (const section of sections) {
		const downloadUrl = section.match(DOWNLOAD_LINK_REGEX)?.[1] ?? null;
		if (!downloadUrl) {
			continue;
		}
		items.push({
			url: decodeTokenizedUri(downloadUrl, "token"),
			is_video: isVideoUrl(downloadUrl),
		});
	}
	return items;
}
