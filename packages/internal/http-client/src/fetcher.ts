import { createHttpClient } from "./http-client";
import type { HttpClient } from "./types";

/**
 * Pre-configured default HTTP client instance with shared User-Agent and retry defaults.
 */
export const fetcher: HttpClient = createHttpClient();
