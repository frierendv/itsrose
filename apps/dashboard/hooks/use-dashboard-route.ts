"use client";

import {
	ADMIN_SIDEBAR_ITEMS,
	DEFAULT_SIDEBAR_ITEMS,
	EXTERNAL_RESOURCE,
	// USER_FEATURES_IMAGE,
	// USER_FEATURES_NEURAL_VOICE,
	USER_LOGS_SIDEBAR_ITEMS,
	USER_SETTINGS_SIDEBAR_ITEMS,
} from "@/constants/sidebar";
import { authClient } from "@/lib/auth";
import type { SidebarItem } from "@/types/sidebar";
import { useSession } from "@better-auth-ui/react";

export function useDashboardRoute() {
	const { isPending, data: session } = useSession(authClient);

	if (isPending || !session) {
		return { isPending, data: null };
	}
	const { user } = session;

	const sidebarMainItems: SidebarItem[] = [
		DEFAULT_SIDEBAR_ITEMS,
		// USER_FEATURES_IMAGE,
		// USER_FEATURES_NEURAL_VOICE,
	];
	const sidebarSecondaryItems: SidebarItem[] = [
		USER_LOGS_SIDEBAR_ITEMS,
		EXTERNAL_RESOURCE,
		USER_SETTINGS_SIDEBAR_ITEMS,
	];
	if (user.role === "admin") {
		sidebarSecondaryItems.push(ADMIN_SIDEBAR_ITEMS);
	}
	const data = {
		sidebarMainItems,
		sidebarSecondaryItems,
	};
	return { isPending, data };
}
