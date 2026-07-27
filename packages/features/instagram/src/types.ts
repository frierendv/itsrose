import type { IInstagramResponse, IMediaNode } from "./zod-schema";

/**
 * Function signature for scraping an Instagram media URL.
 *
 * @param {string} url Target Instagram post or reel URL.
 * @param {AbortController} [controller] Optional AbortController instance for controlling cancellation.
 * @returns {Promise<IInstagramResponse | null>} Scraped Instagram response metadata, or null on failure.
 */
export type ScrapeFn = (
	url: string,
	controller?: AbortController
) => Promise<IInstagramResponse | null>;

/**
 * Function signature for mapping raw scraper media outputs to standardized IMediaNode objects.
 *
 * @template T Type of raw input media structure.
 * @param {T} media Raw media data.
 * @returns {IMediaNode[]} Array of parsed media nodes.
 */
export type ParseMediaUrl<T> = (media: T) => IMediaNode[];
