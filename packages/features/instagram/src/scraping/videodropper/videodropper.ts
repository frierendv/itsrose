import { fetcher } from "@itsrose/http-client";
import type { ScrapeFn } from "../../types";
import { parseMediaUrl, type VideoDropperMedia } from "./parser";
import { createSignedRequest } from "./request-signer";

export const videodropperScrape: ScrapeFn = async (url, controller) => {
	const { data } = await fetcher.get<VideoDropperMedia>(
		"https://api.videodropper.app/allinone",
		{
			signal: controller?.signal,
			headers: {
				"Content-Type": "application/json",
				"X-Requested-With": "XMLHttpRequest",
				...createSignedRequest(url),
			},
		}
	);
	// abort others fn
	controller?.abort();

	if (!data) {
		return null;
	}
	return { media_list: parseMediaUrl(data) };
};
