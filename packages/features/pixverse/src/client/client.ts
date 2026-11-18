import { randomUUID } from "node:crypto";
import { createUpstreamClient } from "@itsrose/upstream-client";
import { PIXVERSE_API_KEY, PIXVERSE_BASE_URL } from "../config";
import { mapPixverseError } from "./errors";

/**
 * The header PixVerse traces a request by.
 *
 * The value has to be a fresh UUID v4 per request, and it is not an
 * idempotency key: reusing one may create a second task.
 */
export const PIXVERSE_TRACE_HEADER = "Ai-trace-id";

/**
 * The header the API key is sent in.
 *
 * PixVerse requires the key in the header - never in the body or the query.
 */
export const PIXVERSE_API_KEY_HEADER = "API-KEY";

/**
 * The client the package reaches PixVerse through.
 *
 * The trace identifier is applied here rather than at every call site: it
 * belongs to the seam, and a caller should not be able to forget it.
 */
export const httpClient = createUpstreamClient({
	service: "pixverse",
	baseURL: PIXVERSE_BASE_URL,
	headers: {
		[PIXVERSE_API_KEY_HEADER]: PIXVERSE_API_KEY,
	},
	requestTransform: (config) => {
		config.headers.set(PIXVERSE_TRACE_HEADER, randomUUID());
		return config;
	},
	mapError: mapPixverseError,
});
