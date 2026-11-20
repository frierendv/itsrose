import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ThirdPartyApiError } from "@itsrose/system";

/**
 * Largest response body a caller-supplied media URL may download.
 *
 * Both audio endpoints accept a URL from the caller and forward the bytes
 * they find there, so an unbounded download would let one request hold the
 * whole response in memory.
 */
export const MAX_REMOTE_MEDIA_BYTES = 25 * 1024 * 1024;

/**
 * Longest a caller-supplied media download may take, in milliseconds.
 */
export const REMOTE_MEDIA_TIMEOUT_MS = 30_000;

/**
 * The message every rejected media URL is answered with.
 *
 * It is deliberately generic: the reason a URL was rejected — the DNS answer,
 * the address it resolved to, the internal name it used — must not be echoed
 * back to the caller, because that turns the guard into a network probe.
 */
const REJECTED_MEDIA_URL_MESSAGE = "The provided media URL is not allowed.";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Names that are answered from the local machine, the local network or a
 * cloud metadata service. They are rejected before any DNS query is made, so
 * a resolver that maps them elsewhere cannot talk the guard into a fetch.
 */
const BLOCKED_HOSTNAMES = new Set([
	"localhost",
	"local",
	"internal",
	"metadata",
	"instance-data",
	"metadata.google.internal",
	"metadata.goog",
	"metadata.azure.internal",
	"kubernetes.default.svc",
]);

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal"];

const IPV6_GROUP_COUNT = 8;

/**
 * A host name as the guard compares it: lower case, without a trailing dot.
 *
 * A fully qualified name such as `localhost.` means the same host as
 * `localhost` to the resolver, so it has to be compared the same way.
 *
 * @param hostname The host name taken from a URL or a lookup call.
 * @returns The host name in its canonical form for comparison.
 */
const normalizeHostname = (hostname: string): string =>
	hostname.toLowerCase().replace(/\.+$/, "");

/**
 * Removes the brackets a URL keeps around an IPv6 literal.
 *
 * @param hostname The host name taken from a URL.
 * @returns The host name without the IPv6 brackets.
 */
const unbracket = (hostname: string): string => {
	if (hostname.startsWith("[") && hostname.endsWith("]")) {
		return hostname.slice(1, -1);
	}
	return hostname;
};

/**
 * Builds the failure a rejected media URL is answered with.
 *
 * Every rejection uses the same message and status: the caller is told that
 * the URL is not allowed, never why.
 *
 * @returns The failure to raise.
 */
const rejectMediaUrl = (): ThirdPartyApiError =>
	new ThirdPartyApiError(REJECTED_MEDIA_URL_MESSAGE, 400);

/**
 * Decides whether a host name is refused before it is resolved.
 *
 * @param hostname The canonical host name.
 * @returns True when the name belongs to the local machine or a metadata service.
 */
const isBlockedHostname = (hostname: string): boolean =>
	BLOCKED_HOSTNAMES.has(hostname) ||
	BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));

/**
 * Parses an IPv4 address into its four octets.
 *
 * @param address The address to parse.
 * @returns The octets, or `undefined` when the address is not IPv4.
 */
const parseIpv4 = (
	address: string
): [number, number, number, number] | undefined => {
	const parts = address.split(".");
	if (parts.length !== 4) {
		return undefined;
	}

	const octets: number[] = [];
	for (const part of parts) {
		if (!/^\d{1,3}$/.test(part)) {
			return undefined;
		}
		const octet = Number(part);
		if (octet > 255) {
			return undefined;
		}
		octets.push(octet);
	}

	const [first, second, third, fourth] = octets;
	if (
		first === undefined ||
		second === undefined ||
		third === undefined ||
		fourth === undefined
	) {
		return undefined;
	}
	return [first, second, third, fourth];
};

/**
 * Decides whether an IPv4 address is not publicly routable.
 *
 * Besides the private, loopback and link-local ranges, this rejects the
 * special-purpose ranges a request must never reach: this-network, carrier
 * NAT, the documentation and benchmarking ranges, multicast and the reserved
 * class E space.
 *
 * @param address The IPv4 address to classify.
 * @returns True when the address must not be fetched.
 */
const isBlockedIpv4 = (address: string): boolean => {
	const parsed = parseIpv4(address);
	if (!parsed) {
		return true;
	}

	const [first, second, third] = parsed;
	// 0.0.0.0/8 (this network), 10.0.0.0/8 (private), 127.0.0.0/8 (loopback).
	if (first === 0 || first === 10 || first === 127) {
		return true;
	}
	// 100.64.0.0/10 (carrier-grade NAT).
	if (first === 100 && second >= 64 && second <= 127) {
		return true;
	}
	// 169.254.0.0/16 (link-local, cloud metadata).
	if (first === 169 && second === 254) {
		return true;
	}
	// 172.16.0.0/12 (private).
	if (first === 172 && second >= 16 && second <= 31) {
		return true;
	}
	// 192.0.0.0/24 (IETF protocol assignments) and 192.0.2.0/24 (TEST-NET-1).
	if (first === 192 && second === 0 && (third === 0 || third === 2)) {
		return true;
	}
	// 192.88.99.0/24 (deprecated 6to4 relay anycast).
	if (first === 192 && second === 88 && third === 99) {
		return true;
	}
	// 192.168.0.0/16 (private).
	if (first === 192 && second === 168) {
		return true;
	}
	// 198.18.0.0/15 (benchmarking) and 198.51.100.0/24 (TEST-NET-2).
	if (first === 198 && (second === 18 || second === 19)) {
		return true;
	}
	if (first === 198 && second === 51 && third === 100) {
		return true;
	}
	// 203.0.113.0/24 (TEST-NET-3).
	if (first === 203 && second === 0 && third === 113) {
		return true;
	}
	// 224.0.0.0/4 (multicast), 240.0.0.0/4 (reserved, broadcast included).
	return first >= 224;
};

/**
 * Parses the bare hexadecimal groups of an IPv6 address segment.
 *
 * @param segment The segment to parse, `undefined` when the address has none.
 * @returns The groups, or `undefined` when the segment is not hexadecimal.
 */
const parseIpv6Groups = (segment: string | undefined): number[] | undefined => {
	if (!segment) {
		return [];
	}

	const groups: number[] = [];
	for (const group of segment.split(":")) {
		if (!/^[0-9a-f]{1,4}$/.test(group)) {
			return undefined;
		}
		groups.push(Number.parseInt(group, 16));
	}
	return groups;
};

/**
 * Expands an IPv6 address into its eight 16-bit groups.
 *
 * A dotted-quad tail (`::ffff:127.0.0.1`) is rewritten into the two groups it
 * stands for, so every address the guard looks at is analysed in the same
 * shape.
 *
 * @param address The address to expand.
 * @returns The eight groups, or `undefined` when the address is not IPv6.
 */
const expandIpv6 = (address: string): number[] | undefined => {
	let normalized = address.toLowerCase();

	if (normalized.includes(".")) {
		const lastColon = normalized.lastIndexOf(":");
		if (lastColon === -1) {
			return undefined;
		}
		const ipv4 = parseIpv4(normalized.slice(lastColon + 1));
		if (!ipv4) {
			return undefined;
		}
		const [first, second, third, fourth] = ipv4;
		const high = (first << 8) | second;
		const low = (third << 8) | fourth;
		normalized = `${normalized.slice(0, lastColon + 1)}${high.toString(16)}:${low.toString(16)}`;
	}

	const halves = normalized.split("::");
	if (halves.length > 2) {
		return undefined;
	}

	const head = parseIpv6Groups(halves[0]);
	const tail = parseIpv6Groups(halves[1]);
	if (!head || !tail) {
		return undefined;
	}

	if (halves.length === 1) {
		return head.length === IPV6_GROUP_COUNT ? head : undefined;
	}

	const omitted = IPV6_GROUP_COUNT - head.length - tail.length;
	if (omitted < 1) {
		return undefined;
	}
	return [...head, ...new Array<number>(omitted).fill(0), ...tail];
};

/**
 * Renders the 32 bits an IPv6 form embeds as a dotted-quad IPv4 address.
 *
 * @param high The upper 16 bits.
 * @param low The lower 16 bits.
 * @returns The address in IPv4 notation.
 */
const embeddedIpv4 = (high: number, low: number): string =>
	`${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;

/**
 * Decides whether an IPv6 address is not publicly routable.
 *
 * The mapped, compatible, NAT64 and 6to4 forms embed an IPv4 destination and
 * are judged by that destination, so `::ffff:127.0.0.1` is refused for the
 * same reason `127.0.0.1` is.
 *
 * @param address The IPv6 address to classify.
 * @returns True when the address must not be fetched.
 */
const isBlockedIpv6 = (address: string): boolean => {
	const groups = expandIpv6(address);
	if (!groups) {
		return true;
	}

	const [
		first = 0,
		second = 0,
		third = 0,
		fourth = 0,
		fifth = 0,
		sixth = 0,
		seventh = 0,
		eighth = 0,
	] = groups;

	// `::` (unspecified) and `::1` (loopback).
	if (
		first === 0 &&
		second === 0 &&
		third === 0 &&
		fourth === 0 &&
		fifth === 0 &&
		sixth === 0 &&
		seventh === 0 &&
		(eighth === 0 || eighth === 1)
	) {
		return true;
	}
	// `ff00::/8` (multicast).
	if ((first & 0xff00) === 0xff00) {
		return true;
	}
	// `fe80::/10` (link-local) and the deprecated `fec0::/10` (site-local).
	if ((first & 0xffc0) === 0xfe80 || (first & 0xffc0) === 0xfec0) {
		return true;
	}
	// `fc00::/7` (unique-local).
	if ((first & 0xfe00) === 0xfc00) {
		return true;
	}
	// `::ffff:0:0/96` (IPv4-mapped): judge the address it maps to.
	if (
		first === 0 &&
		second === 0 &&
		third === 0 &&
		fourth === 0 &&
		fifth === 0 &&
		sixth === 0xffff
	) {
		return isBlockedIpv4(embeddedIpv4(seventh, eighth));
	}
	// `::/96` (IPv4-compatible), deprecated but still an IPv4 address.
	if (
		first === 0 &&
		second === 0 &&
		third === 0 &&
		fourth === 0 &&
		fifth === 0 &&
		sixth === 0
	) {
		return true;
	}
	// `2001:db8::/32` (documentation).
	if (first === 0x2001 && second === 0x0db8) {
		return true;
	}
	// `2001::/32` (Teredo), which tunnels to an arbitrary IPv4 address.
	if (first === 0x2001 && second === 0) {
		return true;
	}
	// `64:ff9b::/96` (NAT64), which maps to an arbitrary IPv4 address.
	if (
		first === 0x0064 &&
		second === 0xff9b &&
		third === 0 &&
		fourth === 0 &&
		fifth === 0 &&
		sixth === 0
	) {
		return true;
	}
	// `2002::/16` (6to4), which embeds the IPv4 destination.
	if (first === 0x2002) {
		return isBlockedIpv4(embeddedIpv4(second, third));
	}
	return false;
};

/**
 * Decides whether a resolved address must not be connected to.
 *
 * @param address The address a DNS answer carried.
 * @returns True when the address is not a public unicast destination.
 */
const isBlockedAddress = (address: string): boolean => {
	const family = isIP(address);
	if (family === 4) {
		return isBlockedIpv4(address);
	}
	if (family === 6) {
		return isBlockedIpv6(address);
	}
	// A DNS answer that is not an address cannot be connected to safely.
	return true;
};

/**
 * A validated DNS answer.
 *
 * The family is narrowed to the two values a TCP connection can use, which is
 * also the shape the transport's lookup callback expects.
 */
export interface ResolvedAddress {
	address: string;
	family: 4 | 6;
}

type LookupAddressEntry = ResolvedAddress | string;

type MediaLookupCallback = (
	error: Error | null,
	address: LookupAddressEntry | LookupAddressEntry[],
	family?: 4 | 6
) => void;

/**
 * A `lookup` implementation for the transport, in the shape Node's `net`
 * module hands to `http.request`.
 */
export type MediaLookup = (
	hostname: string,
	options: object,
	callback: MediaLookupCallback
) => void;

/**
 * Turns a DNS answer into a validated address.
 *
 * @param entry One answer of the resolver.
 * @returns The address, or `undefined` when it must not be connected to.
 */
const toResolvedAddress = (
	entry: LookupAddress
): ResolvedAddress | undefined => {
	if (entry.family !== 4 && entry.family !== 6) {
		return undefined;
	}
	if (isBlockedAddress(entry.address)) {
		return undefined;
	}
	return { address: entry.address, family: entry.family };
};

/**
 * Resolves a host name and refuses it unless every answer is public.
 *
 * An IP literal is classified directly and never handed to the resolver.
 *
 * @param hostname The canonical host name to resolve.
 * @returns The validated addresses.
 * @throws {ThirdPartyApiError} When the name cannot be resolved or any of its
 * answers is not a public unicast destination.
 */
const resolveAddresses = async (
	hostname: string
): Promise<ResolvedAddress[]> => {
	const literalFamily = isIP(hostname);
	if (literalFamily === 4 || literalFamily === 6) {
		if (isBlockedAddress(hostname)) {
			throw rejectMediaUrl();
		}
		return [{ address: hostname, family: literalFamily }];
	}

	const resolved = await lookup(hostname, { all: true });
	const addresses: ResolvedAddress[] = [];
	for (const entry of resolved) {
		const address = toResolvedAddress(entry);
		if (!address) {
			throw rejectMediaUrl();
		}
		addresses.push(address);
	}
	if (addresses.length === 0) {
		throw rejectMediaUrl();
	}
	return addresses;
};

/**
 * Parses and syntactically validates a caller-supplied media URL.
 *
 * @param raw The URL the caller sent.
 * @returns The parsed URL.
 * @throws {ThirdPartyApiError} When the URL is unparseable, does not use
 * `http:` or `https:`, or embeds credentials.
 */
const parseRemoteMediaUrl = (raw: string): URL => {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw rejectMediaUrl();
	}

	if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
		throw rejectMediaUrl();
	}
	if (url.username !== "" || url.password !== "") {
		throw rejectMediaUrl();
	}
	if (url.hostname === "") {
		throw rejectMediaUrl();
	}
	return url;
};

/**
 * Validates a caller-supplied media URL before the API fetches it.
 *
 * The guard exists because both voice-cloning endpoints download a URL the
 * caller chose and hand the bytes to the upstream. Without it, any caller can
 * make the API process fetch loopback, private-network, link-local or cloud
 * metadata addresses and exfiltrate whatever it can read.
 *
 * The URL is refused when:
 *
 * - it is not an absolute `http:` or `https:` URL;
 * - it embeds credentials;
 * - its host is `localhost`, a `*.localhost`, `*.local` or `*.internal` name,
 *   or a well-known cloud metadata host;
 * - any address the host resolves to is not a public unicast destination
 *   (private, loopback, link-local, multicast, unspecified, documentation,
 *   carrier NAT or otherwise reserved — IPv4 and IPv6, including the
 *   IPv4-mapped, IPv4-compatible, NAT64 and 6to4 forms);
 * - the host cannot be resolved at all.
 *
 * DNS details never reach the caller: every rejection is the same generic
 * {@linkcode ThirdPartyApiError} with status 400.
 *
 * @param raw The URL the caller sent.
 * @returns The parsed URL, once it is known to be safe to fetch.
 * @throws {ThirdPartyApiError} When the URL is not allowed.
 */
export const assertSafeRemoteMediaUrl = async (raw: string): Promise<URL> => {
	const url = parseRemoteMediaUrl(raw);
	const hostname = normalizeHostname(unbracket(url.hostname));

	if (hostname === "") {
		throw rejectMediaUrl();
	}
	if (isIP(hostname) === 0 && isBlockedHostname(hostname)) {
		throw rejectMediaUrl();
	}

	try {
		await resolveAddresses(hostname);
	} catch {
		// The resolver failure is deliberately dropped: its message carries the
		// DNS name and the resolver's reason, which are not the caller's to see.
		throw rejectMediaUrl();
	}
	return url;
};

/**
 * A transport `lookup` that validates the address it is about to connect to.
 *
 * Passing this as the request's `lookup` closes the DNS-rebinding window the
 * guard alone leaves open: the guard resolves the name once, and between that
 * answer and the connection the record could change. Here the resolver is
 * asked again at connect time and every answer is checked before it is
 * returned, so the socket is bound to an address that passed the same rules
 * as the guard. A name that now resolves to a blocked address is rejected.
 *
 * @param hostname The name the transport is about to connect to.
 * @param options The transport's lookup options (`all` selects the shape).
 * @param callback The transport's callback.
 */
export const safeMediaLookup: MediaLookup = (hostname, options, callback) => {
	void resolveAddresses(normalizeHostname(unbracket(hostname)))
		.then((addresses) => {
			if ("all" in options && options.all === true) {
				callback(null, addresses);
				return;
			}
			const [first] = addresses;
			if (!first) {
				callback(rejectMediaUrl(), "");
				return;
			}
			callback(null, first.address, first.family);
		})
		.catch(() => {
			callback(rejectMediaUrl(), "");
		});
};
