import {
	createUpstreamClient,
	parseUpstreamPayload,
} from "@itsrose/upstream-client";
import type { ScrapeFn } from "../../types";
import { InstagramResponseSchema } from "../../zod-schema";
import { VIDEODROPPER_ENDPOINT } from "../endpoints";
import { parseMediaUrl, type VideoDropperMedia } from "./parser";
import { createSignedRequest } from "./request-signer";

/**
 * The client the videodropper scraper talks with.
 */
export const videodropperClient = createUpstreamClient({
	service: "instagram-videodropper",
});

export const videodropperScrape: ScrapeFn = async (
	url,
	controller,
	endpoint = VIDEODROPPER_ENDPOINT
) => {
	const data = await videodropperClient.send<VideoDropperMedia>({
		url: endpoint,
		signal: controller?.signal,
		headers: {
			"Content-Type": "application/json",
			"X-Requested-With": "XMLHttpRequest",
			...createSignedRequest(url),
		},
	});
	// abort others fn
	controller?.abort();

	if (!data) {
		return null;
	}

	return parseUpstreamPayload(
		InstagramResponseSchema,
		{ media_list: parseMediaUrl(data) },
		{ service: "instagram-videodropper", label: "media" }
	);
};
