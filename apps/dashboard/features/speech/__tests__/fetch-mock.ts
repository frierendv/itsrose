import type { Mock } from "vitest";

/** The subset of the global `fetch` the dashboard clients call. */
export type FetchLike = (
	input: RequestInfo | URL,
	init?: RequestInit
) => Promise<Response>;

/** One intercepted request, decoded for a route handler. */
export type MockedRequest = {
	/** The absolute request URL, including its query string. */
	url: URL;
	/** The uppercased HTTP method. */
	method: string;
	/** The JSON body when there is one, otherwise `undefined`. */
	body: unknown;
};

/** One method+path a test stubs, and the response it answers with. */
export type FetchRoute = {
	/** The HTTP method the route matches, e.g. `"GET"`. */
	method: string;
	/** The exact URL pathname the route matches, e.g. `"/studio/voices"`. */
	path: string;
	respond: (request: MockedRequest) => Response | Promise<Response>;
};

/** Builds a JSON `Response`, the way the dashboard's API clients read one. */
export function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function toUrl(input: RequestInfo | URL): URL {
	if (typeof input === "string") {
		return new URL(input);
	}
	if (input instanceof URL) {
		return input;
	}
	return new URL(input.url);
}

function toMethod(input: RequestInfo | URL, init?: RequestInit): string {
	if (init?.method) {
		return init.method.toUpperCase();
	}
	if (typeof input === "object" && !(input instanceof URL)) {
		return (input.method || "GET").toUpperCase();
	}
	return "GET";
}

function toBody(init?: RequestInit): unknown {
	if (typeof init?.body !== "string") {
		return undefined;
	}

	try {
		return JSON.parse(init.body);
	} catch {
		return init.body;
	}
}

/**
 * Installs a `fetch` stub that answers the declared routes and fails on any
 * other request.
 *
 * A request without a route throws instead of reaching the network, so a
 * forgotten mock fails loudly in the test that made the call. The global is
 * restored by `vi.unstubAllGlobals()` in the suite's `afterEach`.
 */
export function mockFetch(routes: readonly FetchRoute[]): Mock<FetchLike> {
	const fetchMock = vi.fn<FetchLike>(async (input, init) => {
		const url = toUrl(input);
		const method = toMethod(input, init);
		const route = routes.find(
			(candidate) =>
				candidate.method === method && candidate.path === url.pathname
		);

		if (!route) {
			throw new Error(
				`Unexpected request in a test: ${method} ${url.href}. Add a fetch route for it.`
			);
		}

		return route.respond({ url, method, body: toBody(init) });
	});

	vi.stubGlobal("fetch", fetchMock);

	return fetchMock;
}
