import { vi } from "vitest";

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

	/*
	 * ProseMirror maps a mouse position to a document position through
	 * `document.elementFromPoint`, which jsdom does not implement. Returning
	 * null makes the editor ignore the click, which is all a test needs; the
	 * selection is driven with keyboard input instead.
	 */
	Object.defineProperty(Document.prototype, "elementFromPoint", {
		configurable: true,
		writable: true,
		value: () => null,
	});

	/*
	 * ProseMirror asks the selection's Range for its client rects while
	 * scrolling the caret into view after a DOM change. jsdom implements
	 * selection but not geometry, so the range reports an empty rect instead
	 * of throwing; no test depends on real layout.
	 */
	if (typeof Range !== "undefined") {
		const emptyRectList = Object.assign([], {
			item: () => null,
		}) as unknown as DOMRectList;

		Object.defineProperties(Range.prototype, {
			getBoundingClientRect: {
				configurable: true,
				writable: true,
				value: () => new DOMRect(),
			},
			getClientRects: {
				configurable: true,
				writable: true,
				value: () => emptyRectList,
			},
		});
	}

	/*
	 * jsdom implements neither playback nor loading of media, so the global
	 * audio player's `play()`/`load()` would throw. The player only needs the
	 * element to accept the calls; its visible state is React state that the
	 * play/pause events would update in a real browser.
	 */
	for (const method of ["play", "pause", "load"] as const) {
		Object.defineProperty(window.HTMLMediaElement.prototype, method, {
			configurable: true,
			writable: true,
			value:
				method === "play"
					? vi.fn().mockResolvedValue(undefined)
					: vi.fn(),
		});
	}
}
