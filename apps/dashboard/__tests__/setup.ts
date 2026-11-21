import {
	ReadableStream,
	TransformStream,
	WritableStream,
} from "node:stream/web";
import type { SetupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

/*
 * jsdom ships no Web Streams globals, and MSW reads them while its SSE module
 * is evaluated and while it wraps an intercepted response. The polyfill has
 * to exist before `msw` is imported, so the server is imported in the hook
 * below instead of here.
 */
const webStreams = { ReadableStream, TransformStream, WritableStream };
for (const [name, value] of Object.entries(webStreams)) {
	if (!(name in globalThis)) {
		Object.defineProperty(globalThis, name, {
			configurable: true,
			writable: true,
			value,
		});
	}
}

/*
 * jsdom does not implement the browser APIs React Aria probes. Defining them
 * once here keeps every component test from repeating the same polyfills.
 * `proxy.test.ts` opts into the node environment, where there is no window.
 */
if (typeof window !== "undefined") {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}),
	});

	Object.defineProperty(window, "ResizeObserver", {
		configurable: true,
		writable: true,
		value: class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	});

	Object.defineProperty(Element.prototype, "scrollIntoView", {
		configurable: true,
		writable: true,
		value: vi.fn(),
	});
}

/** The MSW server, imported after the Web Streams polyfill above runs. */
let server: SetupServer | undefined;

/**
 * Starts the dashboard's MSW server for every suite in this project.
 *
 * A request without a handler is an error, not a passthrough: tests must
 * declare the endpoint they call, so a forgotten mock fails loudly instead of
 * reaching the network.
 */
beforeAll(async () => {
	const msw = await import("./msw/server");
	server = msw.server;
	server.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
	server?.resetHandlers();
});

afterAll(() => {
	server?.close();
});
