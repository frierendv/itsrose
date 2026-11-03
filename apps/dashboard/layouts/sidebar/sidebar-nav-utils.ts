"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { useActivePath } from "@/hooks/use-active-path";
import type { SidebarItem } from "@/types/sidebar";
import { useCallback, useState } from "react";

/**
 * Checks if a given URL is active against the current pathname.
 * Root `/` requires an exact match.
 * Nested paths match exactly or by segment prefix (e.g. `/admin/transaction` matches `/admin/transaction/events`).
 */
export function isRouteActive(pathname: string, url: string): boolean {
	if (!pathname || !url) {
		return false;
	}
	if (url === "/") {
		return pathname === "/";
	}
	if (pathname === url) {
		return true;
	}
	return pathname === `${url}/`;
}

/**
 * Recursively checks if any descendant item of the given SidebarItem is active.
 */
export function hasActiveDescendant(
	item: SidebarItem,
	pathname: string
): boolean {
	if (!item.items || item.items.length === 0) {
		return false;
	}
	return item.items.some(
		(child) =>
			isRouteActive(pathname, child.url) ||
			hasActiveDescendant(child, pathname)
	);
}

/**
 * Collects all descendant URLs from a SidebarItem recursively.
 */
export function getAllDescendantUrls(item: SidebarItem): string[] {
	if (!item.items || item.items.length === 0) {
		return [];
	}
	return item.items.flatMap((child) => [
		child.url,
		...getAllDescendantUrls(child),
	]);
}

export function useSidebarNavigation() {
	const { isMobile, setOpenMobile } = useSidebar();

	const closeMobileSidebar = useCallback(() => {
		if (isMobile) {
			setOpenMobile(false);
		}
	}, [isMobile, setOpenMobile]);

	return { closeMobileSidebar };
}

/**
 * Hook to manage active state, recursive child active detection,
 * and auto-expansion for a SidebarItem.
 */
export function useSidebarItemState(item: SidebarItem) {
	const { pathname } = useActivePath();

	const isExactActive = isRouteActive(pathname, item.url);
	const hasActiveChild = hasActiveDescendant(item, pathname);
	const isActive = isExactActive || hasActiveChild;

	// Track whether the user explicitly toggled this accordion item
	const [wasManuallyToggled, setWasManuallyToggled] = useState<
		boolean | null
	>(null);

	// Reset manual toggle override whenever the active child context changes
	const [prevHasActiveChild, setPrevHasActiveChild] =
		useState(hasActiveChild);
	if (hasActiveChild !== prevHasActiveChild) {
		setPrevHasActiveChild(hasActiveChild);
		setWasManuallyToggled(null);
	}

	const isOpen =
		wasManuallyToggled !== null ? wasManuallyToggled : hasActiveChild;

	const setIsOpen = useCallback(
		(nextOpen: boolean | ((prev: boolean) => boolean)) => {
			setWasManuallyToggled((currentOverride) => {
				const currentRealValue =
					currentOverride !== null ? currentOverride : hasActiveChild;
				return typeof nextOpen === "function"
					? nextOpen(currentRealValue)
					: nextOpen;
			});
		},
		[hasActiveChild]
	);

	return {
		pathname,
		isExactActive,
		hasActiveChild,
		isActive,
		isOpen,
		setIsOpen,
	};
}
