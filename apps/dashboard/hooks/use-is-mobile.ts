"use client";

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

const getSnapshot = () => {
	if (typeof window === "undefined" || !window.matchMedia) {
		return false;
	}
	return window.matchMedia(MOBILE_QUERY).matches;
};

const getServerSnapshot = () => false;

const subscribe = (onStoreChange: () => void) => {
	if (typeof window === "undefined" || !window.matchMedia) {
		return () => undefined;
	}
	const mql = window.matchMedia(MOBILE_QUERY);
	const handleChange = () => onStoreChange();
	mql.addEventListener("change", handleChange);
	return () => mql.removeEventListener("change", handleChange);
};

export const useIsMobile = () =>
	useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
