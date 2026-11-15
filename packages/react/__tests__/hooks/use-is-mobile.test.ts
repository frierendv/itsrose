import { act, renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { useIsMobile } from "../../src/hooks/use-is-mobile";

describe("hooks/useIsMobile", () => {
	const originalMatchMedia = window.matchMedia;

	afterEach(() => {
		window.matchMedia = originalMatchMedia;
	});

	it("returns false when matchMedia returns matches: false", () => {
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));

		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(false);
	});

	it("returns true when matchMedia returns matches: true", () => {
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: true,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));

		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(true);
	});

	it("subscribes to media query changes and updates value", () => {
		let changeListener: (() => void) | undefined;
		let matchesState = false;

		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			get matches() {
				return matchesState;
			},
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn((event: string, callback: () => void) => {
				if (event === "change") {
					changeListener = callback;
				}
			}),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));

		const { result } = renderHook(() => useIsMobile());
		expect(result.current).toBe(false);

		// Trigger change event
		act(() => {
			matchesState = true;
			changeListener?.();
		});

		expect(result.current).toBe(true);
	});

	it("cleans up change listener on unmount", () => {
		const removeEventListener = vi.fn();

		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener,
			dispatchEvent: vi.fn(),
		}));

		const { unmount } = renderHook(() => useIsMobile());
		unmount();

		expect(removeEventListener).toHaveBeenCalledWith(
			"change",
			expect.any(Function)
		);
	});

	it("returns false if window.matchMedia is undefined and cleans up safely", () => {
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: undefined,
		});

		const { result, unmount } = renderHook(() => useIsMobile());
		expect(result.current).toBe(false);
		expect(() => unmount()).not.toThrow();
	});

	it("returns false on server-side rendering (getServerSnapshot)", async () => {
		const React = await import("react");
		const { renderToString } = await import("react-dom/server");

		const TestComponent = () => {
			const isMobile = useIsMobile();
			return React.createElement(
				"div",
				null,
				`isMobile: ${String(isMobile)}`
			);
		};

		const html = renderToString(React.createElement(TestComponent));
		expect(html).toContain("isMobile: false");
	});
});
