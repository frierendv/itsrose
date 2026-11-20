import {
	MAX_REMOTE_MEDIA_BYTES,
	REMOTE_MEDIA_TIMEOUT_MS,
	safeMediaLookup,
} from "../utils";
import { assetClient } from "./client";

/**
 * Downloads caller-supplied media through the credential-less asset client.
 *
 * The URL must already have been validated by
 * {@linkcode assertSafeRemoteMediaUrl}; this only hardens the transport around
 * that decision:
 *
 * - no redirects, so a public URL cannot bounce the fetch onto a private one
 *   after the guard approved it (`maxRedirects: 0`, and any 3xx is an error);
 * - a deadline, so a peer that trickles bytes cannot pin the request open;
 * - a byte cap, so the response cannot be used as a memory amplifier;
 * - a lookup that re-validates the DNS answer at connect time, so the address
 *   the socket is bound to is one the guard's rules approved. That closes the
 *   window a DNS rebinding would otherwise exploit between the guard's
 *   resolution and the connection.
 *
 * @param url The validated URL to download.
 * @returns The media bytes.
 * @throws {UpstreamApiError} When the download fails, or answers with a
 * redirect, a non-2xx status or more than {@linkcode MAX_REMOTE_MEDIA_BYTES}.
 */
export const downloadRemoteMedia = async (url: URL): Promise<Buffer> =>
	assetClient.send<Buffer>({
		url: url.toString(),
		responseType: "arraybuffer",
		maxRedirects: 0,
		// Only a 2xx body is media. A 3xx is refused rather than followed, and
		// an error status is an error even if a caller's client would tolerate
		// it.
		validateStatus: (status) => status >= 200 && status < 300,
		timeout: REMOTE_MEDIA_TIMEOUT_MS,
		maxContentLength: MAX_REMOTE_MEDIA_BYTES,
		lookup: safeMediaLookup,
	});
