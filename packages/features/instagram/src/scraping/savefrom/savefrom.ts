import { fetcher } from "@itsrose/http-client";
import type { ScrapeFn } from "../../types";
import {
	parseMediaUrl,
	type SaveFromMedia,
	type SaveFromResponse,
} from "./parser";
import { createSignedRequest } from "./request-signer";

export const savefromScrape: ScrapeFn = async (url, controller) => {
	const { data } = await fetcher.post<SaveFromResponse | SaveFromResponse[]>(
		"https://save-from.net/api/convert",
		new URLSearchParams(createSignedRequest(url)),
		{
			signal: controller?.signal,
		}
	);
	// abort others fn
	controller?.abort();

	if (!data) {
		return null;
	}
	const medias: SaveFromMedia[] = Array.isArray(data)
		? data.flatMap((item) => item.url)
		: data.url;
	return { media_list: parseMediaUrl(medias) };
};
