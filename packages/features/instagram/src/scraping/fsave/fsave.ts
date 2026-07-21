import { fetcher } from "@itsrose/http-client";
import type { ScrapeFn } from "../../types";
import { extractEvalPayload } from "../helpers";
import { parseMediaUrl } from "./parser";

export const fsaveScrape: ScrapeFn = async (url, controller) => {
	const formData = new FormData();
	formData.append("url", url);

	const { data } = await fetcher.post<string>(
		"https://fsave.io/action.php?lang=en",
		formData,
		{
			signal: controller?.signal,
			headers: {
				"Content-Type": "multipart/form-data",
			},
			responseType: "text",
		}
	);
	// abort others fn
	controller?.abort();

	const markup = extractEvalPayload(data.trim());
	if (!markup) {
		return null;
	}

	return { media_list: parseMediaUrl(markup) };
};
