import {
	parseUpstreamPayload,
	UpstreamApiError,
} from "@itsrose/upstream-client";
import { fsaveScrape, savefromScrape, videodropperScrape } from "../scraping";
import type { IInstagramRequest, IInstagramResponse } from "../zod-schema";
import { InstagramRequestSchema, InstagramResponseSchema } from "../zod-schema";

/**
 * Scrapes media from Instagram using multiple scrapers and returns the first successful result.
 *
 * @param {IInstagramRequest} options
 * @returns {Promise<IInstagramResponse>}
 * @throws {UpstreamApiError} If no scraper returns a result, or the result
 * does not match the published schema.
 */
export const getMedia = async (
	options: IInstagramRequest
): Promise<IInstagramResponse> => {
	const { url } = options;
	const controller = new AbortController();

	const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

	// get faster scraping by racing the scrapers
	const race = await Promise.race([
		// To reduce heavy load on the server;Only 3 scrapers are used here
		fsaveScrape(url, controller).catch(() => null),
		videodropperScrape(url, controller).catch(() => null),
		savefromScrape(url, controller).catch(() => null),
	]).finally(() => {
		clearTimeout(timeoutId);
		// in case fn don't abort the other fns
		controller.abort();
	});

	// if no scraper returned a result
	if (!race) {
		throw new UpstreamApiError(
			`No scraper returned a result for ${url}`,
			500,
			{ service: "instagram" }
		);
	}

	return parseUpstreamPayload(InstagramResponseSchema, race, {
		service: "instagram",
		label: "media",
	});
};

export const getMediaSchema = {
	request: InstagramRequestSchema,
	response: InstagramResponseSchema,
};
