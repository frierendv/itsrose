import type { IMediaNode } from "../../zod-schema";

export type SaveFromMedia = { url: string; type: string };
export type SaveFromResponse = { url: SaveFromMedia[] };

function normalizeUrl(url: string) {
	try {
		const uri = new URL(url).searchParams.get("uri");
		return uri ? decodeURIComponent(uri) : url;
	} catch {
		return url;
	}
}
export function parseMediaUrl(medias: SaveFromMedia[]): IMediaNode[] {
	return medias.map((media) => ({
		url: normalizeUrl(media.url),
		is_video: media.type === "mp4",
	}));
}
