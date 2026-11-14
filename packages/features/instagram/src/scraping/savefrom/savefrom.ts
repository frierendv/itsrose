import {
	createUpstreamClient,
	parseUpstreamPayload,
} from "@itsrose/upstream-client";
import type { ScrapeFn } from "../../types";
import { InstagramResponseSchema } from "../../zod-schema";
import { SAVEFROM_ENDPOINT } from "../endpoints";
import {
	parseMediaUrl,
	type SaveFromMedia,
	type SaveFromResponse,
} from "./parser";
import { createSignedRequest } from "./request-signer";

/**
 * The client the savefrom scraper talks with.
 */
export const savefromClient = createUpstreamClient({
	service: "instagram-savefrom",
});

export const savefromScrape: ScrapeFn = async (
	url,
	controller,
	endpoint = SAVEFROM_ENDPOINT
) => {
	const data = await savefromClient.send<
		SaveFromResponse | SaveFromResponse[]
	>({
		url: endpoint,
		method: "post",
		data: new URLSearchParams(createSignedRequest(url)),
		signal: controller?.signal,
	});
	// abort others fn
	controller?.abort();

	if (!data) {
		return null;
	}
	const medias: SaveFromMedia[] = Array.isArray(data)
		? data.flatMap((item) => item.url)
		: data.url;

	return parseUpstreamPayload(
		InstagramResponseSchema,
		{ media_list: parseMediaUrl(medias) },
		{ service: "instagram-savefrom", label: "media" }
	);
};
