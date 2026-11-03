"use client";

import { useCallback, useSyncExternalStore } from "react";
import { SIDEBAR_COOKIE_NAME, SIDEBAR_STORE_KEY } from "./constants";

const STORAGE_EVENT = "sidebar:state-change";

function getCookieValue(name: string): string | null {
	if (typeof document === "undefined") {
		return null;
	}
	const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match && match[1] ? decodeURIComponent(match[1]) : null;
}

function subscribe(callback: () => void): () => void {
	if (typeof window === "undefined") {
		return () => {};
	}

	const handleStorage = (event: StorageEvent) => {
		if (event.key === SIDEBAR_STORE_KEY) {
			callback();
		}
	};

	window.addEventListener("storage", handleStorage);
	window.addEventListener(STORAGE_EVENT, callback);

	return () => {
		window.removeEventListener("storage", handleStorage);
		window.removeEventListener(STORAGE_EVENT, callback);
	};
}

export function useSidebarPersistedState(defaultOpen = true) {
	const getSnapshot = useCallback(() => {
		if (typeof window === "undefined") {
			return defaultOpen;
		}
		try {
			const item = window.localStorage.getItem(SIDEBAR_STORE_KEY);
			if (item !== null) {
				return item === "true";
			}
			const cookieVal = getCookieValue(SIDEBAR_COOKIE_NAME);
			if (cookieVal !== null) {
				return cookieVal === "true";
			}
			return defaultOpen;
		} catch {
			return defaultOpen;
		}
	}, [defaultOpen]);

	const getServerSnapshot = useCallback(() => defaultOpen, [defaultOpen]);

	const open = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getServerSnapshot
	);

	const setOpen = useCallback(
		(value: boolean | ((prev: boolean) => boolean)) => {
			const current = getSnapshot();
			const nextValue =
				typeof value === "function" ? value(current) : value;

			try {
				window.localStorage.setItem(
					SIDEBAR_STORE_KEY,
					String(nextValue)
				);
				document.cookie = `${SIDEBAR_COOKIE_NAME}=${nextValue}; path=/; max-age=31536000; SameSite=Lax`;
				window.dispatchEvent(new Event(STORAGE_EVENT));
			} catch (error) {
				console.warn(
					"Failed to save sidebar state to persistence:",
					error
				);
			}
		},
		[getSnapshot]
	);

	return [open, setOpen] as const;
}
