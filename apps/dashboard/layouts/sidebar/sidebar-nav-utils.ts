"use client";

import { useActivePath } from "@/hooks/use-active-path";
import type { SidebarItem } from "@/types/sidebar";
import { useSidebar } from "@itsrose/react/sidebar";
import { useCallback, useState } from "react";
import {
	getAllDescendantUrls,
	hasActiveDescendant,
	isRouteActive,
} from "./route-utils";

export { getAllDescendantUrls, hasActiveDescendant, isRouteActive };

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
