import {
	createUpstreamClient,
	parseUpstreamPayload,
} from "@itsrose/upstream-client";
import type { ScrapeFn } from "../../types";
import { InstagramResponseSchema } from "../../zod-schema";
import { FSAVE_ENDPOINT } from "../endpoints";
import { extractEvalPayload } from "../helpers";
import { parseMediaUrl } from "./parser";

/**
 * The client the fsave scraper talks with.
 */
export const fsaveClient = createUpstreamClient({
	service: "instagram-fsave",
});

export const fsaveScrape: ScrapeFn = async (
	url,
	controller,
	endpoint = FSAVE_ENDPOINT
) => {
	const formData = new FormData();
	formData.append("url", url);

	const data = await fsaveClient.send<string>({
		url: endpoint,
		method: "post",
		data: formData,
		signal: controller?.signal,
		headers: {
			"Content-Type": "multipart/form-data",
		},
		responseType: "text",
	});
	// abort others fn
	controller?.abort();

	const markup = extractEvalPayload(data.trim());
	if (!markup) {
		return null;
	}

	return parseUpstreamPayload(
		InstagramResponseSchema,
		{ media_list: parseMediaUrl(markup) },
		{ service: "instagram-fsave", label: "media" }
	);
};
